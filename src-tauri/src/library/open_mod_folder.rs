use std::path::PathBuf;

use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

use crate::error::AppError;

#[tauri::command(rename_all = "snake_case")]
pub fn open_mod_folder(app: AppHandle, folder: PathBuf) -> Result<(), AppError> {
    if !folder.is_dir() {
        return Err(AppError::Custom(format!(
            "{} doesn't exist.",
            folder.display()
        )));
    }
    app.opener()
        .open_path(folder.to_string_lossy(), None::<&str>)
        .map_err(|error| AppError::Custom(error.to_string()))
}
