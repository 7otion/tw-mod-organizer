use std::fs;
use std::path::PathBuf;

use tauri::AppHandle;

use super::{languages_folder, parse_language_file};
use crate::error::AppError;

#[tauri::command(async, rename_all = "snake_case")]
pub fn install_language_pack(app: AppHandle, path: PathBuf) -> Result<(), AppError> {
    let (id, _) = parse_language_file(&path)?;
    let installed = languages_folder(&app)?.join(format!("{id}.toml"));
    if installed.exists() {
        if installed.canonicalize()? == path.canonicalize()? {
            return Ok(());
        }
        trash::delete(&installed)?;
    }
    fs::copy(&path, &installed)?;
    Ok(())
}
