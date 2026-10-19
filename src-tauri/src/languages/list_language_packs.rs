use std::fs;

use tauri::AppHandle;

use super::{languages_folder, parse_language_file};
use crate::error::AppError;

#[tauri::command(async, rename_all = "snake_case")]
pub fn list_language_packs(app: AppHandle) -> Result<Vec<serde_json::Value>, AppError> {
    let mut packs = Vec::new();
    for entry in fs::read_dir(languages_folder(&app)?)? {
        let file = entry?.path();
        if file.extension().is_none_or(|extension| extension != "toml") {
            continue;
        }
        match parse_language_file(&file) {
            Ok((_, pack)) => packs.push(pack),
            Err(error) => {
                tracing::warn!(file = %file.display(), "skipped a language file: {error}")
            }
        }
    }
    Ok(packs)
}
