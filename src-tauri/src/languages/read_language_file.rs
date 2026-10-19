use std::path::PathBuf;

use super::parse_language_file;
use crate::error::AppError;

#[tauri::command(async, rename_all = "snake_case")]
pub fn read_language_file(path: PathBuf) -> Result<serde_json::Value, AppError> {
    Ok(parse_language_file(&path)?.1)
}
