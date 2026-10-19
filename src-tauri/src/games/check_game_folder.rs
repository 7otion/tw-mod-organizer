use std::path::PathBuf;

use crate::error::AppError;

#[tauri::command(rename_all = "snake_case")]
pub fn check_game_folder(app_id: u32, path: PathBuf) -> Result<(), AppError> {
    let game = super::find(app_id)?;
    if game.holds_game(&path) {
        return Ok(());
    }
    let info = game.info();
    Err(AppError::Custom(format!(
        "{} isn't a {}: {} folder.",
        path.display(),
        info.series,
        info.title
    )))
}
