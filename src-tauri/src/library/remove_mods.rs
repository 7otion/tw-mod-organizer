use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::AppHandle;

use crate::error::AppError;
use crate::games;
use crate::s7forge::workshop;
use crate::settings;

#[derive(Default, Serialize)]
pub struct RemovedMods {
    unsubscribed: Vec<u64>,
    trashed: Vec<PathBuf>,
    failures: Vec<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_mods(
    app: AppHandle,
    app_id: u32,
    item_ids: Vec<u64>,
    folders: Vec<PathBuf>,
) -> Result<RemovedMods, AppError> {
    let game = games::find(app_id)?;
    let mods_folder = settings::mods_dir(&app)
        .await?
        .join(game.mods_folder_name());
    let mut removed = RemovedMods::default();
    match workshop::unsubscribe(&app, app_id, &item_ids).await {
        Ok(results) => {
            for result in results {
                if result.success {
                    removed.unsubscribed.push(result.item_id);
                    continue;
                }
                let reason = result.error.unwrap_or_else(|| "unknown error".to_owned());
                removed
                    .failures
                    .push(format!("Workshop item {}: {reason}", result.item_id));
            }
        }
        Err(error) => {
            for item_id in &item_ids {
                removed
                    .failures
                    .push(format!("Workshop item {item_id}: {error}"));
            }
        }
    }
    tauri::async_runtime::spawn_blocking(move || {
        for folder in folders {
            match trash_mod_folder(&mods_folder, &folder) {
                Ok(()) => removed.trashed.push(folder),
                Err(error) => removed
                    .failures
                    .push(format!("{}: {error}", folder.display())),
            }
        }
        removed
    })
    .await
    .map_err(|error| AppError::Custom(error.to_string()))
}

fn trash_mod_folder(mods_folder: &Path, folder: &Path) -> Result<(), AppError> {
    let mods_folder = mods_folder.canonicalize()?;
    let folder = folder.canonicalize()?;
    if folder.parent() != Some(mods_folder.as_path()) {
        return Err(AppError::Custom(
            "isn't a mod folder inside the mods folder".to_owned(),
        ));
    }
    trash::delete(&folder)?;
    Ok(())
}
