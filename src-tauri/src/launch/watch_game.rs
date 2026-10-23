use tauri::AppHandle;

use super::{Watcher, is_running};
use crate::error::AppError;
use crate::games;

#[tauri::command(rename_all = "snake_case")]
pub async fn watch_game(app: AppHandle, app_id: u32) -> Result<bool, AppError> {
    let game = games::find(app_id)?;
    let process_name = game.process_name();
    let running = tauri::async_runtime::spawn_blocking(move || is_running(process_name))
        .await
        .map_err(|error| AppError::Custom(error.to_string()))??;
    if running {
        Watcher::start(app, app_id, process_name, false);
    }
    Ok(running)
}
