use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::UNIX_EPOCH;

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::error::AppError;
use crate::games::{self, GameSupport};
use crate::s7forge::workshop::{self, WorkshopItem};
use crate::settings;
use crate::steam::tags::tag_from_steam_tag;

const PROGRESS_EVERY: usize = 25;

#[derive(Serialize)]
pub struct LibraryScan {
    steam_view: SteamView,
    mods: Vec<LibraryMod>,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
enum SteamView {
    Subscriptions,
    WorkshopFolder,
    Unreachable,
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
    steam: Option<SteamDetails>,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
enum ScanSource {
    Steam,
    Local,
}

#[derive(Serialize)]
struct SteamDetails {
    title: String,
    description: String,
    author_name: String,
    author_ref: String,
    page_url: String,
    preview_url: Option<String>,
    published_at: u64,
    remote_updated_at: u64,
    tags: Vec<String>,
    required: Vec<RequiredItem>,
}

#[derive(Serialize)]
struct RequiredItem {
    item_ref: String,
    title: Option<String>,
}

#[derive(Serialize)]
struct ScanProgress {
    app_id: u32,
    done: usize,
    total: usize,
}

#[derive(Default)]
pub struct LibraryScans {
    running: Mutex<Option<RunningScan>>,
}

struct RunningScan {
    app_id: u32,
    is_cancelled: Arc<AtomicBool>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn scan_library(
    app: AppHandle,
    scans: State<'_, LibraryScans>,
    app_id: u32,
) -> Result<Option<LibraryScan>, AppError> {
    let is_cancelled = scans.start(app_id);
    let game = games::find(app_id)?;
    let mods_folder = settings::mods_dir(&app)
        .await?
        .join(game.mods_folder_name());
    let subscribed = workshop::subscribed_items(&app, app_id)
        .await
        .inspect_err(|error| tracing::debug!(app_id, "Steam unavailable: {error}"))
        .ok();
    let workshop_folder = match subscribed {
        Some(_) => None,
        None => workshop::workshop_path(&app, app_id)
            .await
            .inspect_err(|error| tracing::debug!(app_id, "no workshop folder: {error}"))
            .ok(),
    };
    let required_titles = match &subscribed {
        Some(items) => required_titles(&app, app_id, items).await,
        None => HashMap::new(),
    };
    let steam_view = match (&subscribed, &workshop_folder) {
        (Some(_), _) => SteamView::Subscriptions,
        (None, Some(_)) => SteamView::WorkshopFolder,
        (None, None) => SteamView::Unreachable,
    };

    let scan = tauri::async_runtime::spawn_blocking({
        let is_cancelled = is_cancelled.clone();
        move || {
            fs::create_dir_all(&mods_folder)?;
            let local_folders = subfolders(&mods_folder)?;
            let mut workshop_folders = match workshop_folder {
                Some(workshop_folder) => subfolders(&workshop_folder)?,
                None => Vec::new(),
            };
            workshop_folders.retain(|(name, _)| name.parse::<u64>().is_ok());
            let steam_count = match &subscribed {
                Some(items) => items.len(),
                None => workshop_folders.len(),
            };

            let mut progress = ScanProgress {
                app_id,
                done: 0,
                total: steam_count + local_folders.len(),
            };
            report_progress(&app, &progress);
            let mut mods = Vec::with_capacity(progress.total);
            let mut add = |library_mod: LibraryMod| {
                mods.push(library_mod);
                progress.done += 1;
                report_progress(&app, &progress);
                !is_cancelled.load(Ordering::SeqCst)
            };

            match subscribed {
                Some(items) => {
                    for item in items {
                        if !add(steam_mod(game, item, &required_titles)) {
                            return Ok(None);
                        }
                    }
                }
                None => {
                    for (item_id, folder) in workshop_folders {
                        if !add(read_mod(game, ScanSource::Steam, item_id, folder)) {
                            return Ok(None);
                        }
                    }
                }
            }
            for (name, folder) in local_folders {
                let source_ref = game.local_source_ref(&name);
                if !add(read_mod(game, ScanSource::Local, source_ref, folder)) {
                    return Ok(None);
                }
            }

            Ok(Some(LibraryScan { steam_view, mods }))
        }
    })
    .await
    .map_err(|error| AppError::Custom(error.to_string()))?;
    scans.finish(&is_cancelled);
    if is_cancelled.load(Ordering::SeqCst) {
        return Ok(None);
    }
    scan
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

fn steam_mod(
    game: &dyn GameSupport,
    item: WorkshopItem,
    required_titles: &HashMap<u64, String>,
) -> LibraryMod {
    let source_ref = item.published_file_id.to_string();
    let files = match &item.install {
        Some(install) => read_mod(game, ScanSource::Steam, source_ref, install.folder.clone()),
        None => without_files(ScanSource::Steam, source_ref, None, "not_downloaded"),
    };
    let mut tags = Vec::new();
    for steam_tag in &item.tags {
        if let Some(tag) = tag_from_steam_tag(steam_tag, game.ignored_steam_tags()) {
            tags.push(tag);
        }
    }
    let mut required = Vec::with_capacity(item.required_items.len());
    for item_id in &item.required_items {
        required.push(RequiredItem {
            item_ref: item_id.to_string(),
            title: required_titles.get(item_id).cloned(),
        });
    }
    LibraryMod {
        size_bytes: item.install.as_ref().map(|install| install.size_on_disk),
        installed_updated_at: item.install.as_ref().map(|install| install.time_updated),
        added_at: item.time_subscribed,
        steam: Some(SteamDetails {
            title: item.title,
            description: item.description,
            author_name: item.creator_name,
            author_ref: item.creator_id,
            page_url: item.url,
            preview_url: item.preview_url,
            published_at: item.time_created,
            remote_updated_at: item.time_updated,
            tags,
            required,
        }),
        ..files
    }
}

async fn required_titles(
    app: &AppHandle,
    app_id: u32,
    items: &[WorkshopItem],
) -> HashMap<u64, String> {
    let mut titles = HashMap::with_capacity(items.len());
    for item in items {
        titles.insert(item.published_file_id, item.title.clone());
    }
    let mut missing = Vec::new();
    for item in items {
        for item_id in &item.required_items {
            if !titles.contains_key(item_id) && !missing.contains(item_id) {
                missing.push(*item_id);
            }
        }
    }
    match workshop::workshop_items(app, app_id, &missing).await {
        Ok(found) => {
            for item in found {
                titles.insert(item.published_file_id, item.title);
            }
        }
        Err(error) => tracing::debug!(app_id, "no titles for missing requirements: {error}"),
    }
    titles
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
            steam: None,
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
        steam: None,
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

fn report_progress(app: &AppHandle, progress: &ScanProgress) {
    if progress.done % PROGRESS_EVERY != 0 && progress.done != progress.total {
        return;
    }
    if let Err(error) = app.emit("library-scan-progress", progress) {
        tracing::debug!("couldn't report scan progress: {error}");
    }
}
