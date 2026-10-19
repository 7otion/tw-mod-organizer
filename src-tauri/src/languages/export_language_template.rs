use std::fs;
use std::path::PathBuf;

use crate::error::AppError;

const ENGLISH: &str = include_str!("../../../src/lib/i18n/languages/en.toml");

#[tauri::command(async, rename_all = "snake_case")]
pub fn export_language_template(destination: PathBuf) -> Result<(), AppError> {
    if destination.exists() {
        trash::delete(&destination)?;
    }
    fs::write(&destination, ENGLISH)?;
    Ok(())
}
