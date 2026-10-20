use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Instant, UNIX_EPOCH};

use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

use crate::error::AppError;
use crate::games::{self, GameSupport};
use crate::s7forge::workshop::{self, StateRoute, WorkshopStateItem};
use crate::settings;

const PROGRESS_EVERY: usize = 25;

#[derive(Serialize)]
pub struct LibraryScan {
    steam_view: SteamView,
    mods: Vec<LibraryMod>,
    pending_details: Vec<String>,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
enum SteamView {
    Subscriptions,
    WorkshopFolder,
    Unreachable,
}

#[derive(Deserialize)]
pub struct KnownMod {
    source_ref: String,
    installed_updated_at: Option<u64>,
    remote_updated_at: Option<u64>,
    size_bytes: Option<u64>,
}

#[derive(Serialize)]
struct LibraryMod {
    source: ScanSource,
    source_ref: String,
    folder: Option<PathBuf>,
    game_ref: Option<String>,
    title: Option<String>,
    preview_file: Option<PathBuf>,
    size_bytes: Option<u64>,
    problem: Option<&'static str>,
    installed_updated_at: Option<u64>,
    added_at: Option<u64>,
    unchanged: bool,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
enum ScanSource {
    Steam,
    Local,
}

#[derive(Serialize)]
struct ScanProgress {
    app_id: u32,
    done: usize,
    total: usize,
}

struct Progress {
    app: AppHandle,
    app_id: u32,
    total: usize,
    done: AtomicUsize,
}

enum Job {
    State {
        item: WorkshopStateItem,
        is_changed: bool,
    },
    Local {
        source_ref: String,
        folder: PathBuf,
    },
}

#[derive(Default)]
pub struct LibraryScans {
    running: Mutex<Option<RunningScan>>,
}

struct RunningScan {
    app_id: u32,
    is_cancelled: Arc<AtomicBool>,
}

struct SteamState {
    route: StateRoute,
    items: Vec<WorkshopStateItem>,
    changed: HashSet<u64>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn scan_library(
    app: AppHandle,
    scans: State<'_, LibraryScans>,
    app_id: u32,
    full: bool,
    known: Vec<KnownMod>,
) -> Result<Option<LibraryScan>, AppError> {
    let started = Instant::now();
    let is_cancelled = scans.start(app_id);
    let game = games::find(app_id)?;
    let mods_folder = settings::mods_dir(&app)
        .await?
        .join(game.mods_folder_name());
    let steam = steam_state(&app, app_id, &known).await;
    let steam_view = match &steam {
        Some(SteamState {
            route: StateRoute::Folder,
            ..
        }) => SteamView::WorkshopFolder,
        Some(_) => SteamView::Subscriptions,
        None => SteamView::Unreachable,
    };
    tracing::info!(
        app_id,
        full,
        elapsed_ms = started.elapsed().as_millis() as u64,
        "steam source ready"
    );

    let scan = tauri::async_runtime::spawn_blocking({
        let is_cancelled = is_cancelled.clone();
        move || {
            fs::create_dir_all(&mods_folder)?;
            let mut jobs: Vec<Job> = match steam {
                Some(SteamState { items, changed, .. }) => items
                    .into_iter()
                    .map(|item| Job::State {
                        is_changed: changed.contains(&item.item_id),
                        item,
                    })
                    .collect(),
                None => Vec::new(),
            };
            for (name, folder) in subfolders(&mods_folder)? {
                jobs.push(Job::Local {
                    source_ref: game.local_source_ref(&name),
                    folder,
                });
            }
            let pending_details = jobs
                .iter()
                .filter_map(|job| match job {
                    Job::State { item, is_changed } if full || *is_changed => {
                        Some(item.item_id.to_string())
                    }
                    _ => None,
                })
                .collect();

            let progress = Progress::start(app, app_id, jobs.len());
            let mods: Vec<Option<LibraryMod>> = jobs
                .into_par_iter()
                .map(|job| {
                    if is_cancelled.load(Ordering::SeqCst) {
                        return None;
                    }
                    let library_mod = match job {
                        Job::State { item, is_changed } => state_mod(game, item, is_changed),
                        Job::Local { source_ref, folder } => {
                            read_mod(game, ScanSource::Local, source_ref, folder)
                        }
                    };
                    progress.done();
                    Some(library_mod)
                })
                .collect();
            if is_cancelled.load(Ordering::SeqCst) {
                return Ok(None);
            }
            Ok(Some(LibraryScan {
                steam_view,
                mods: mods.into_iter().flatten().collect(),
                pending_details,
            }))
        }
    })
    .await
    .map_err(|error| AppError::Custom(error.to_string()))?;
    scans.finish(&is_cancelled);
    tracing::info!(
        app_id,
        elapsed_ms = started.elapsed().as_millis() as u64,
        "library scan built"
    );
    if is_cancelled.load(Ordering::SeqCst) {
        return Ok(None);
    }
    scan
}

async fn steam_state(app: &AppHandle, app_id: u32, known: &[KnownMod]) -> Option<SteamState> {
    let state = workshop::workshop_state(app, app_id)
        .await
        .inspect_err(|error| tracing::debug!(app_id, "no workshop state: {error}"))
        .ok()?;
    let fingerprints: HashMap<&str, &KnownMod> = known
        .iter()
        .map(|mod_| (mod_.source_ref.as_str(), mod_))
        .collect();
    let changed: HashSet<u64> = state
        .items
        .iter()
        .filter(|item| {
            fingerprints
                .get(item.item_id.to_string().as_str())
                .is_none_or(|known| known.differs_from(item))
        })
        .map(|item| item.item_id)
        .collect();
    tracing::debug!(
        app_id,
        "{} of {} subscriptions changed",
        changed.len(),
        state.items.len()
    );
    Some(SteamState {
        route: state.route,
        items: state.items,
        changed,
    })
}

impl KnownMod {
    fn differs_from(&self, item: &WorkshopStateItem) -> bool {
        self.installed_updated_at != item.installed_time_updated
            || self.size_bytes != item.size_on_disk
            || item
                .latest_time_updated
                .is_some_and(|latest| self.remote_updated_at != Some(latest))
            || (item.latest_time_updated.is_none() && item.needs_update)
    }
}

impl Progress {
    fn start(app: AppHandle, app_id: u32, total: usize) -> Self {
        let progress = Self {
            app,
            app_id,
            total,
            done: AtomicUsize::new(0),
        };
        progress.report(0);
        progress
    }

    fn done(&self) {
        let done = self.done.fetch_add(1, Ordering::SeqCst) + 1;
        if done % PROGRESS_EVERY == 0 || done == self.total {
            self.report(done);
        }
    }

    fn report(&self, done: usize) {
        let progress = ScanProgress {
            app_id: self.app_id,
            done,
            total: self.total,
        };
        if let Err(error) = self.app.emit("library-scan-progress", &progress) {
            tracing::debug!("couldn't report scan progress: {error}");
        }
    }
}

impl LibraryScans {
    fn start(&self, app_id: u32) -> Arc<AtomicBool> {
        let is_cancelled = Arc::new(AtomicBool::new(false));
        let mut running = self
            .running
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        if let Some(previous) = running.replace(RunningScan {
            app_id,
            is_cancelled: is_cancelled.clone(),
        }) {
            previous.is_cancelled.store(true, Ordering::SeqCst);
        }
        is_cancelled
    }

    pub fn cancel(&self, app_id: u32) {
        let running = self
            .running
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        if let Some(scan) = running.as_ref().filter(|scan| scan.app_id == app_id) {
            scan.is_cancelled.store(true, Ordering::SeqCst);
        }
    }

    fn finish(&self, is_cancelled: &Arc<AtomicBool>) {
        let mut running = self
            .running
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        if running
            .as_ref()
            .is_some_and(|scan| Arc::ptr_eq(&scan.is_cancelled, is_cancelled))
        {
            *running = None;
        }
    }
}

fn state_mod(game: &dyn GameSupport, item: WorkshopStateItem, is_changed: bool) -> LibraryMod {
    let source_ref = item.item_id.to_string();
    if !is_changed {
        return LibraryMod {
            source: ScanSource::Steam,
            source_ref,
            folder: item.folder,
            game_ref: None,
            title: None,
            preview_file: None,
            size_bytes: item.size_on_disk,
            problem: None,
            installed_updated_at: item.installed_time_updated,
            added_at: None,
            unchanged: true,
        };
    }
    let files = match item
        .folder
        .filter(|folder| item.installed && folder.is_dir())
    {
        Some(folder) => read_mod(game, ScanSource::Steam, source_ref, folder),
        None => without_files(ScanSource::Steam, source_ref, None, "not_downloaded"),
    };
    LibraryMod {
        size_bytes: item.size_on_disk.or(files.size_bytes),
        installed_updated_at: item.installed_time_updated,
        ..files
    }
}

fn read_mod(
    game: &dyn GameSupport,
    source: ScanSource,
    source_ref: String,
    folder: PathBuf,
) -> LibraryMod {
    match game.mod_info(&folder) {
        Ok(info) => LibraryMod {
            source,
            source_ref,
            added_at: match source {
                ScanSource::Local => created_at(&folder),
                ScanSource::Steam => None,
            },
            folder: Some(folder),
            game_ref: info.game_ref,
            title: Some(info.title),
            preview_file: info.preview_file,
            size_bytes: Some(info.size_bytes),
            problem: info.problem,
            installed_updated_at: None,
            unchanged: false,
        },
        Err(error) => {
            tracing::warn!(folder = %folder.display(), "can't read the mod folder: {error}");
            without_files(source, source_ref, Some(folder), "unreadable_folder")
        }
    }
}

fn without_files(
    source: ScanSource,
    source_ref: String,
    folder: Option<PathBuf>,
    problem: &'static str,
) -> LibraryMod {
    LibraryMod {
        source,
        source_ref,
        folder,
        game_ref: None,
        title: None,
        preview_file: None,
        size_bytes: None,
        problem: Some(problem),
        installed_updated_at: None,
        added_at: None,
        unchanged: false,
    }
}

fn subfolders(folder: &Path) -> Result<Vec<(String, PathBuf)>, AppError> {
    let mut folders = Vec::new();
    for entry in fs::read_dir(folder)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            folders.push((
                entry.file_name().to_string_lossy().into_owned(),
                entry.path(),
            ));
        }
    }
    Ok(folders)
}

fn created_at(folder: &Path) -> Option<u64> {
    let created = fs::metadata(folder).and_then(|metadata| metadata.created());
    created
        .ok()
        .and_then(|created| created.duration_since(UNIX_EPOCH).ok())
        .map(|since| since.as_secs())
}
