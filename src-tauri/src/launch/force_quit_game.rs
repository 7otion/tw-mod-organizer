use super::kill;
use crate::error::AppError;
use crate::games;

#[tauri::command(rename_all = "snake_case")]
pub async fn force_quit_game(app_id: u32) -> Result<(), AppError> {
    let process_name = games::find(app_id)?.process_name();
    tauri::async_runtime::spawn_blocking(move || kill(process_name))
        .await
        .map_err(|error| AppError::Custom(error.to_string()))?
}
