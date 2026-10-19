use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::AppError;

pub mod check_game_folder;
pub mod list_games;
mod total_war;

#[derive(Clone, Copy, Serialize)]
pub struct GameInfo {
    pub app_id: u32,
    pub series: &'static str,
    pub title: &'static str,
    pub cover: &'static str,
}

pub struct ModInfo {
    pub game_ref: Option<String>,
    pub title: String,
    pub preview_file: Option<PathBuf>,
    pub size_bytes: u64,
    pub problem: Option<&'static str>,
}

pub trait GameSupport: Sync {
    fn info(&self) -> GameInfo;

    fn mods_folder_name(&self) -> &'static str;

    fn holds_game(&self, path: &Path) -> bool;

    fn mod_info(&self, folder: &Path) -> Result<ModInfo, AppError>;

    fn local_source_ref(&self, folder_name: &str) -> String;

    fn ignored_steam_tags(&self) -> &'static [&'static str];
}

pub static GAMES: [&dyn GameSupport; 3] = [
    &total_war::WARHAMMER_3,
    &total_war::WARHAMMER_2,
    &total_war::THREE_KINGDOMS,
];

pub fn find(app_id: u32) -> Result<&'static dyn GameSupport, AppError> {
    for game in GAMES {
        if game.info().app_id == app_id {
            return Ok(game);
        }
    }
    Err(AppError::Custom(format!(
        "App {app_id} isn't a supported game."
    )))
}
