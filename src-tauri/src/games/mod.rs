use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::AppError;

pub mod check_game_folder;
pub mod detect_games;
mod detection;
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

#[derive(Serialize)]
pub struct InstallInputs {
    pub extensions: &'static [&'static str],
    pub folders: bool,
}

pub struct SourceEntry {
    pub path: String,
    pub size: u64,
}

#[derive(Clone, Serialize)]
pub struct Candidate {
    pub id: String,
    pub name: String,
    pub identity: Fact,
    pub facts: Vec<Fact>,
    pub size_bytes: u64,
    pub entries: Vec<String>,
    pub problem: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct Fact {
    pub label: &'static str,
    pub value: String,
}

#[derive(Serialize)]
pub struct Installable {
    pub candidates: Vec<Candidate>,
    pub selection: Selection,
    pub identities_can_coexist: bool,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Selection {
    Single,
    #[allow(dead_code)]
    Multiple,
}

pub trait GameSupport: Sync {
    fn info(&self) -> GameInfo;

    fn install_inputs(&self) -> InstallInputs;

    fn find_installable(&self, entries: &[SourceEntry]) -> Installable;

    fn nothing_installable_reason(&self) -> &'static str;

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
