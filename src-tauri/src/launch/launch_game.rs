use std::path::PathBuf;

use tauri::AppHandle;

use super::Watcher;
use crate::error::AppError;
use crate::games::{self, LaunchMod};

#[tauri::command(rename_all = "snake_case")]
pub async fn launch_game(
    app: AppHandle,
    app_id: u32,
    install_path: PathBuf,
    mods: Vec<LaunchMod>,
    save: Option<String>,
) -> Result<(), AppError> {
    let game = games::find(app_id)?;
    tauri::async_runtime::spawn_blocking(move || {
        game.launch(&install_path, &mods, save.as_deref())
    })
    .await
    .map_err(|error| AppError::Custom(error.to_string()))??;
    Watcher::start(app, app_id, game.process_name(), true);
    Ok(())
}
