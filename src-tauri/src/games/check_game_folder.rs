use std::path::{Path, PathBuf};

use super::Game;
use crate::error::AppError;

#[tauri::command(rename_all = "snake_case")]
pub fn check_game_folder(app_id: u32, path: PathBuf) -> Result<(), AppError> {
    let game = super::find(app_id)?;
    if holds_game(game, &path) {
        return Ok(());
    }
    Err(AppError::Custom(format!(
        "{} isn't a {}: {} folder.",
        path.display(),
        game.series,
        game.title
    )))
}

#[cfg(windows)]
fn holds_game(game: &Game, path: &Path) -> bool {
    path.join(game.exe).is_file()
}

#[cfg(not(windows))]
fn holds_game(_game: &Game, _path: &Path) -> bool {
    unimplemented!("checking a game folder on this platform")
}
