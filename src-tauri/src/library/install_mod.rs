use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

use crate::archive;
use crate::error::AppError;
use crate::games::{self, GameSupport};
use crate::paths::file_name_of;
use crate::settings;

const REPORT_EVERY_BYTES: u64 = 4 << 20;
const INVALID_NAME_CHARS: [char; 9] = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

#[derive(Deserialize)]
pub struct InstallRequest {
    source: PathBuf,
    mods: Vec<ModToInstall>,
}

#[derive(Deserialize)]
pub struct ModToInstall {
    name: String,
    entries: Vec<String>,
    size_bytes: u64,
    replace_folder: Option<PathBuf>,
}

#[derive(Default, Serialize)]
pub struct InstallResult {
    installed: Vec<PathBuf>,
    problem: Option<InstallProblem>,
    cancelled: bool,
}

#[derive(Serialize)]
pub struct InstallProblem {
    name: String,
    problem: String,
}

#[derive(Clone, Serialize)]
pub struct InstallProgress {
    index: usize,
    total: usize,
    name: String,
    step: InstallStep,
    done: u64,
    total_bytes: u64,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum InstallStep {
    Unpacking,
    Copying,
    Checking,
    Adding,
}

#[derive(Default)]
pub struct Installs {
    running: Mutex<Option<Arc<AtomicBool>>>,
}

struct Install {
    app: AppHandle,
    game: &'static dyn GameSupport,
    source: PathBuf,
    mods_folder: PathBuf,
    is_cancelled: Arc<AtomicBool>,
    total: usize,
}

struct Staged {
    folder: PathBuf,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn install_mod(
    app: AppHandle,
    installs: State<'_, Installs>,
    app_id: u32,
    request: InstallRequest,
) -> Result<InstallResult, AppError> {
    let is_cancelled = installs.start();
    let game = games::find(app_id)?;
    let mods_folder = settings::mods_dir(&app)
        .await?
        .join(game.mods_folder_name());
    fs::create_dir_all(&mods_folder)?;
    let install = Install {
        app,
        game,
        source: request.source,
        mods_folder,
        is_cancelled,
        total: request.mods.len(),
    };
    tauri::async_runtime::spawn_blocking(move || install.run(request.mods))
        .await
        .map_err(|error| AppError::Custom(error.to_string()))?
}

impl Install {
    fn run(&self, mods: Vec<ModToInstall>) -> Result<InstallResult, AppError> {
        let mut result = InstallResult::default();
        for (index, item) in mods.into_iter().enumerate() {
            let staged = Staged {
                folder: self
                    .mods_folder
                    .join(format!(".installing-{}-{index}", millis_now())),
            };
            fs::create_dir_all(&staged.folder)?;
            match self.install_one(index, &item, &staged) {
                Ok(Some(folder)) => result.installed.push(folder),
                Ok(None) => {
                    staged.discard()?;
                    result.problem = Some(InstallProblem {
                        name: item.name,
                        problem: self.problem_of(&staged)?,
                    });
                    return Ok(result);
                }
                Err(error) => {
                    staged.discard()?;
                    if self.is_cancelled.load(Ordering::SeqCst) {
                        result.cancelled = true;
                        return Ok(result);
                    }
                    return Err(error);
                }
            }
        }
        Ok(result)
    }

    fn install_one(
        &self,
        index: usize,
        item: &ModToInstall,
        staged: &Staged,
    ) -> Result<Option<PathBuf>, AppError> {
        if archive::is_archive(&self.source) {
            let mut source = archive::open(&self.source)?;
            let mut report =
                self.reporter(index, &item.name, InstallStep::Unpacking, item.size_bytes);
            let mut unpacked = 0u64;
            for entry in &item.entries {
                let destination = staged.folder.join(file_name_of(entry));
                let base = unpacked;
                let mut progress = |written: u64| report(base + written);
                source.extract(entry, &destination, &mut progress)?;
                unpacked += fs::metadata(&destination)?.len();
            }
        } else {
            let mut report =
                self.reporter(index, &item.name, InstallStep::Copying, item.size_bytes);
            for entry in &item.entries {
                let path = Path::new(entry);
                let destination = staged.folder.join(path.file_name().unwrap_or_default());
                let mut file = File::open(path)?;
                archive::copy_with_progress(&mut file, &destination, &mut report)?;
            }
        }
        self.report(index, &item.name, InstallStep::Checking, 0, 0);
        self.check_cancelled()?;
        if self.game.mod_info(&staged.folder)?.problem.is_some() {
            return Ok(None);
        }
        self.report(index, &item.name, InstallStep::Adding, 0, 0);
        self.check_cancelled()?;
        let folder = match &item.replace_folder {
            Some(existing) => self.replace_into(existing, staged)?,
            None => {
                let folder = unique_folder(&self.mods_folder, &sanitise(&item.name));
                fs::rename(&staged.folder, &folder)?;
                folder
            }
        };
        Ok(Some(folder))
    }

    fn problem_of(&self, staged: &Staged) -> Result<String, AppError> {
        Ok(self
            .game
            .mod_info(&staged.folder)
            .ok()
            .and_then(|info| info.problem)
            .unwrap_or("unreadable_folder")
            .to_owned())
    }

    fn replace_into(&self, existing: &Path, staged: &Staged) -> Result<PathBuf, AppError> {
        let incoming: Vec<PathBuf> = fs::read_dir(&staged.folder)?
            .map(|entry| entry.map(|entry| entry.path()))
            .collect::<Result<_, _>>()?;
        let keep: Vec<_> = incoming
            .iter()
            .filter_map(|path| path.file_name().map(|name| name.to_os_string()))
            .collect();
        for entry in fs::read_dir(existing)? {
            let path = entry?.path();
            let is_same_kind = path.extension().is_some_and(|extension| {
                incoming
                    .iter()
                    .any(|new| new.extension() == Some(extension))
            });
            let is_overwritten = path
                .file_name()
                .is_some_and(|name| keep.iter().any(|kept| kept == name));
            if path.is_file() && (is_same_kind || is_overwritten) {
                trash::delete(&path)?;
            }
        }
        for path in incoming {
            let Some(name) = path.file_name() else {
                continue;
            };
            fs::rename(&path, existing.join(name))?;
        }
        fs::remove_dir(&staged.folder)?;
        Ok(existing.to_path_buf())
    }

    fn reporter<'a>(
        &'a self,
        index: usize,
        name: &'a str,
        step: InstallStep,
        total: u64,
    ) -> impl FnMut(u64) -> Result<(), AppError> + 'a {
        let mut last_reported = 0u64;
        self.report(index, name, step, 0, total);
        move |done| {
            self.check_cancelled()?;
            if done - last_reported >= REPORT_EVERY_BYTES || done >= total {
                last_reported = done;
                self.report(index, name, step, done, total);
            }
            Ok(())
        }
    }

    fn report(&self, index: usize, name: &str, step: InstallStep, done: u64, total_bytes: u64) {
        let progress = InstallProgress {
            index,
            total: self.total,
            name: name.to_owned(),
            step,
            done,
            total_bytes,
        };
        if let Err(error) = self.app.emit("install-progress", &progress) {
            tracing::debug!("couldn't report install progress: {error}");
        }
    }

    fn check_cancelled(&self) -> Result<(), AppError> {
        if self.is_cancelled.load(Ordering::SeqCst) {
            return Err(AppError::Custom("The install was cancelled".to_owned()));
        }
        Ok(())
    }
}

impl Staged {
    fn discard(&self) -> Result<(), AppError> {
        if !self.folder.exists() {
            return Ok(());
        }
        if fs::read_dir(&self.folder)?.next().is_none() {
            fs::remove_dir(&self.folder)?;
        } else {
            trash::delete(&self.folder)?;
        }
        Ok(())
    }
}

impl Installs {
    fn start(&self) -> Arc<AtomicBool> {
        let is_cancelled = Arc::new(AtomicBool::new(false));
        let mut running = self
            .running
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        if let Some(previous) = running.replace(is_cancelled.clone()) {
            previous.store(true, Ordering::SeqCst);
        }
        is_cancelled
    }

    pub fn cancel(&self) {
        let running = self
            .running
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        if let Some(install) = running.as_ref() {
            install.store(true, Ordering::SeqCst);
        }
    }
}

fn sanitise(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|character| {
            if INVALID_NAME_CHARS.contains(&character) || character.is_control() {
                '_'
            } else {
                character
            }
        })
        .collect();
    let trimmed = cleaned.trim().trim_end_matches('.').trim();
    if trimmed.is_empty() {
        "mod".to_owned()
    } else {
        trimmed.to_owned()
    }
}

fn unique_folder(parent: &Path, name: &str) -> PathBuf {
    let first = parent.join(name);
    if !first.exists() {
        return first;
    }
    let mut counter = 2;
    loop {
        let candidate = parent.join(format!("{name} ({counter})"));
        if !candidate.exists() {
            return candidate;
        }
        counter += 1;
    }
}

fn millis_now() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis())
        .unwrap_or_default()
}
