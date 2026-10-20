use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::archive;
use crate::error::AppError;
use crate::games::{self, Candidate, InstallInputs, Selection, SourceEntry};
use crate::paths::extension_of;

#[derive(Serialize)]
pub struct Inspection {
    source: Source,
    candidates: Vec<Candidate>,
    selection: Selection,
    identities_can_coexist: bool,
    nothing_installable_reason: &'static str,
}

#[derive(Serialize)]
pub struct Source {
    path: PathBuf,
    name: String,
    folder: Option<String>,
    kind: SourceKind,
    size_bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SourceKind {
    File,
    Archive,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn inspect_install_source(app_id: u32, path: PathBuf) -> Result<Inspection, AppError> {
    let game = games::find(app_id)?;
    let size_bytes = fs::metadata(&path)?.len();
    let name = file_name(&path);
    let folder = path.parent().map(file_name);
    let is_archive = archive::is_archive(&path);
    let entries = if is_archive {
        tauri::async_runtime::spawn_blocking({
            let path = path.clone();
            move || archive::open(&path)?.entries()
        })
        .await
        .map_err(|error| AppError::Custom(error.to_string()))??
        .into_iter()
        .map(|entry| SourceEntry {
            path: entry.path,
            size: entry.size,
        })
        .collect()
    } else if accepts(&game.install_inputs(), &path) {
        vec![SourceEntry {
            path: path.to_string_lossy().into_owned(),
            size: size_bytes,
        }]
    } else {
        return Err(AppError::Custom(format!(
            "{name} is not a file this game accepts"
        )));
    };
    let installable = game.find_installable(&entries);
    Ok(Inspection {
        source: Source {
            path,
            name,
            folder,
            kind: if is_archive {
                SourceKind::Archive
            } else {
                SourceKind::File
            },
            size_bytes,
        },
        candidates: installable.candidates,
        selection: installable.selection,
        identities_can_coexist: installable.identities_can_coexist,
        nothing_installable_reason: game.nothing_installable_reason(),
    })
}

fn accepts(inputs: &InstallInputs, path: &Path) -> bool {
    extension_of(path).is_some_and(|extension| inputs.extensions.contains(&extension.as_str()))
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default()
}
