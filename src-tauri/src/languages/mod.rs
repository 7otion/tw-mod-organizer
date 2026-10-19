use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::error::AppError;

pub mod export_language_template;
pub mod install_language_pack;
pub mod list_language_packs;
pub mod read_language_file;

const MAX_ID_LENGTH: usize = 32;

fn languages_folder(app: &AppHandle) -> Result<PathBuf, AppError> {
    let folder = app.path().app_data_dir()?.join("languages");
    fs::create_dir_all(&folder)?;
    Ok(folder)
}

fn parse_language_file(path: &Path) -> Result<(String, serde_json::Value), AppError> {
    let table: toml::Table = toml::from_str(&fs::read_to_string(path)?)?;
    let id = table
        .get("language")
        .and_then(|language| language.get("id"))
        .and_then(|id| id.as_str())
        .filter(|id| is_language_id(id))
        .ok_or_else(|| AppError::Custom("The file has no valid language.id.".to_owned()))?
        .to_owned();
    Ok((id, serde_json::to_value(table)?))
}

fn is_language_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_ID_LENGTH
        && id
            .chars()
            .all(|letter| letter.is_ascii_alphanumeric() || letter == '-' || letter == '_')
}
