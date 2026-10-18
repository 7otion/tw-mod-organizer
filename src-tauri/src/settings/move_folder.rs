use std::ffi::OsString;
use std::fs::{self, File};
use std::io::{ErrorKind, Read, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sqlx::{Row, SqliteConnection};
use tauri::{AppHandle, Emitter};

use crate::error::AppError;

const PROGRESS_EVENT: &str = "folder-move-progress";
const CHUNK: usize = 1024 * 1024;

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FolderColumn {
    ModsDir,
    DownloadsDir,
}

impl FolderColumn {
    fn name(self) -> &'static str {
        match self {
            Self::ModsDir => "mods_dir",
            Self::DownloadsDir => "downloads_dir",
        }
    }
}

#[derive(Clone, Serialize)]
struct MoveProgress {
    copied: u64,
    total: u64,
}

enum Staged {
    Created,
    Renamed,
    MovedEntries(Vec<OsString>),
    Copied,
}

struct Copier<'a> {
    app: &'a AppHandle,
    buffer: Vec<u8>,
    copied: u64,
    total: u64,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn move_folder(
    app: AppHandle,
    column: FolderColumn,
    to: PathBuf,
) -> Result<Option<PathBuf>, AppError> {
    let from = PathBuf::from(read_folder(&app, column).await?);

    let staged = {
        let (app, from, to) = (app.clone(), from.clone(), to.clone());
        blocking(move || stage(&app, &from, &to)).await?
    };

    if let Err(error) = write_folder(&app, column, &to).await {
        let undone = {
            let (from, to) = (from.clone(), to.clone());
            blocking(move || Ok(undo(staged, &from, &to))).await?
        };
        return Err(if undone {
            error
        } else {
            incomplete(error, &from, &to)
        });
    }

    blocking(move || Ok(finish(staged, &from))).await
}

async fn blocking<T: Send + 'static>(
    work: impl FnOnce() -> Result<T, AppError> + Send + 'static,
) -> Result<T, AppError> {
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|error| AppError::Custom(error.to_string()))?
}

async fn read_folder(app: &AppHandle, column: FolderColumn) -> Result<String, AppError> {
    super::with_database(app, async |connection: &mut SqliteConnection| {
        let sql = format!("SELECT {} FROM settings WHERE id = 1", column.name());
        let row = sqlx::query(&sql).fetch_one(&mut *connection).await?;
        Ok(row.try_get(0)?)
    })
    .await
}

async fn write_folder(app: &AppHandle, column: FolderColumn, to: &Path) -> Result<(), AppError> {
    let value = to.to_string_lossy().into_owned();
    super::with_database(app, async |connection: &mut SqliteConnection| {
        let sql = format!("UPDATE settings SET {} = ? WHERE id = 1", column.name());
        let result = sqlx::query(&sql)
            .bind(&value)
            .execute(&mut *connection)
            .await?;
        if result.rows_affected() != 1 {
            return Err(AppError::Custom(
                "The settings row is missing, so the new folder couldn't be saved.".to_owned(),
            ));
        }
        Ok(())
    })
    .await
}

fn stage(app: &AppHandle, from: &Path, to: &Path) -> Result<Staged, AppError> {
    let (source, target) = (resolve(from), resolve(to));
    if target.starts_with(&source) || source.starts_with(&target) {
        return Err(AppError::Custom(
            "A folder can't move into itself or into one of its own folders.".to_owned(),
        ));
    }
    let is_new = !to.exists();
    if !is_new && fs::read_dir(to)?.next().is_some() {
        return Err(AppError::Custom(format!(
            "{} already has files in it. Choose an empty folder.",
            to.display()
        )));
    }

    if !from.exists() {
        fs::create_dir_all(to)?;
        return Ok(Staged::Created);
    }

    if is_new {
        if let Some(parent) = to.parent() {
            fs::create_dir_all(parent)?;
        }
        match fs::rename(from, to) {
            Ok(()) => return Ok(Staged::Renamed),
            Err(error) if error.kind() != ErrorKind::CrossesDevices => return Err(error.into()),
            Err(_) => {}
        }
    } else if let Some(moved) = rename_entries(from, to)? {
        return Ok(Staged::MovedEntries(moved));
    }

    copy(app, from, to)
}

fn rename_entries(from: &Path, to: &Path) -> Result<Option<Vec<OsString>>, AppError> {
    let names = fs::read_dir(from)?
        .map(|entry| entry.map(|entry| entry.file_name()))
        .collect::<Result<Vec<_>, _>>()?;
    let mut moved = Vec::with_capacity(names.len());
    for name in names {
        match fs::rename(from.join(&name), to.join(&name)) {
            Ok(()) => moved.push(name),
            Err(error) if moved.is_empty() && error.kind() == ErrorKind::CrossesDevices => {
                return Ok(None);
            }
            Err(error) => {
                return Err(if move_back(&moved, from, to) {
                    error.into()
                } else {
                    incomplete(error.into(), from, to)
                });
            }
        }
    }
    Ok(Some(moved))
}

fn copy(app: &AppHandle, from: &Path, to: &Path) -> Result<Staged, AppError> {
    let total = size_of(from)?;
    let available = fs4::available_space(existing_ancestor(to))?;
    if total > available {
        return Err(AppError::Custom(format!(
            "Not enough space on {}: the folder needs {} MB, {} MB are free.",
            to.display(),
            megabytes(total),
            megabytes(available)
        )));
    }

    fs::create_dir_all(to)?;
    let mut copier = Copier {
        app,
        buffer: vec![0; CHUNK],
        copied: 0,
        total,
    };
    let copied = copier.copy_tree(from, to).and_then(|()| {
        let size = size_of(to)?;
        if size == total {
            return Ok(());
        }
        Err(AppError::Custom(format!(
            "The copy holds {} MB but the folder holds {} MB: it changed while it was being moved.",
            megabytes(size),
            megabytes(total)
        )))
    });
    if let Err(error) = copied {
        return Err(if clear(to) {
            error
        } else {
            incomplete(error, from, to)
        });
    }
    Ok(Staged::Copied)
}

fn undo(staged: Staged, from: &Path, to: &Path) -> bool {
    match staged {
        Staged::Created => true,
        Staged::Renamed => match fs::rename(to, from) {
            Ok(()) => true,
            Err(error) => {
                tracing::error!(%error, "could not move {} back", to.display());
                false
            }
        },
        Staged::MovedEntries(names) => move_back(&names, from, to),
        Staged::Copied => clear(to),
    }
}

fn finish(staged: Staged, from: &Path) -> Option<PathBuf> {
    match staged {
        Staged::Created | Staged::Renamed => None,
        Staged::MovedEntries(_) | Staged::Copied => match trash::delete(from) {
            Ok(()) => None,
            Err(error) => {
                tracing::error!(%error, "could not trash {}", from.display());
                Some(from.to_path_buf())
            }
        },
    }
}

fn move_back(names: &[OsString], from: &Path, to: &Path) -> bool {
    let mut is_complete = true;
    for name in names.iter().rev() {
        if let Err(error) = fs::rename(to.join(name), from.join(name)) {
            tracing::error!(%error, "could not move {} back", to.join(name).display());
            is_complete = false;
        }
    }
    is_complete
}

fn clear(folder: &Path) -> bool {
    let entries = match fs::read_dir(folder) {
        Ok(entries) => entries,
        Err(error) => {
            tracing::error!(%error, "could not read {} to clear it", folder.display());
            return false;
        }
    };
    let mut is_complete = true;
    for entry in entries {
        let cleared = entry
            .map_err(AppError::from)
            .and_then(|entry| Ok(trash::delete(entry.path())?));
        if let Err(error) = cleared {
            tracing::error!(%error, "could not trash part of {}", folder.display());
            is_complete = false;
        }
    }
    is_complete
}

fn incomplete(error: AppError, from: &Path, to: &Path) -> AppError {
    AppError::Custom(format!(
        "{error} It couldn't be fully undone: check {} and {}.",
        from.display(),
        to.display()
    ))
}

fn existing_ancestor(path: &Path) -> &Path {
    path.ancestors()
        .find(|ancestor| ancestor.exists())
        .unwrap_or(path)
}

fn resolve(path: &Path) -> PathBuf {
    let base = existing_ancestor(path);
    let rest = path.strip_prefix(base).unwrap_or(Path::new(""));
    base.canonicalize()
        .unwrap_or_else(|_| base.to_path_buf())
        .join(rest)
}

impl Copier<'_> {
    fn copy_tree(&mut self, from: &Path, to: &Path) -> Result<(), AppError> {
        for entry in fs::read_dir(from)? {
            let entry = entry?;
            let target = to.join(entry.file_name());
            if entry.file_type()?.is_dir() {
                fs::create_dir(&target)?;
                self.copy_tree(&entry.path(), &target)?;
            } else {
                self.copy_file(&entry.path(), &target)?;
            }
        }
        Ok(())
    }

    fn copy_file(&mut self, from: &Path, to: &Path) -> Result<(), AppError> {
        let mut source = File::open(from)?;
        let mut target = File::create(to)?;
        loop {
            let read = source.read(&mut self.buffer)?;
            if read == 0 {
                break;
            }
            target.write_all(&self.buffer[..read])?;
            self.copied += read as u64;
            let _ = self.app.emit(
                PROGRESS_EVENT,
                MoveProgress {
                    copied: self.copied,
                    total: self.total,
                },
            );
        }
        target.set_modified(source.metadata()?.modified()?)?;
        Ok(())
    }
}

fn size_of(folder: &Path) -> Result<u64, AppError> {
    let mut size = 0;
    for entry in fs::read_dir(folder)? {
        let entry = entry?;
        if entry.file_type()?.is_symlink() {
            return Err(AppError::Custom(format!(
                "{} is a link, which can't be copied to another disk. Move it out of the folder first.",
                entry.path().display()
            )));
        }
        let metadata = entry.metadata()?;
        size += if metadata.is_dir() {
            size_of(&entry.path())?
        } else {
            metadata.len()
        };
    }
    Ok(size)
}

fn megabytes(bytes: u64) -> String {
    format!("{:.1}", bytes as f64 / 1024.0 / 1024.0)
}
