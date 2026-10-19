use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::error::AppError;

#[tauri::command(async, rename_all = "snake_case")]
pub fn set_cover_image(app: AppHandle, mod_id: i64, source: PathBuf) -> Result<PathBuf, AppError> {
    let folder = app.path().app_data_dir()?.join("covers");
    fs::create_dir_all(&folder)?;
    let extension = source
        .extension()
        .map(|extension| extension.to_string_lossy().to_ascii_lowercase())
        .ok_or_else(|| AppError::Custom("The image has no file extension.".to_owned()))?;
    let cover = folder.join(format!("{mod_id}.{extension}"));
    if cover.exists() && cover.canonicalize()? == source.canonicalize()? {
        return Ok(cover);
    }
    let previous = previous_covers(&folder, mod_id)?;
    if !previous.is_empty() {
        trash::delete_all(&previous)?;
    }
    fs::copy(&source, &cover)?;
    Ok(cover)
}

fn previous_covers(folder: &Path, mod_id: i64) -> Result<Vec<PathBuf>, AppError> {
    let mut covers = Vec::new();
    for entry in fs::read_dir(folder)? {
        let file = entry?.path();
        let stem = file
            .file_stem()
            .map(|stem| stem.to_string_lossy().into_owned());
        if stem.as_deref() == Some(mod_id.to_string().as_str()) {
            covers.push(file);
        }
    }
    Ok(covers)
}
