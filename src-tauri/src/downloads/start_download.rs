use std::path::PathBuf;

use tauri::AppHandle;

use super::Transfer;
use crate::error::AppError;

#[tauri::command(rename_all = "snake_case")]
pub fn start_download(
    app: AppHandle,
    id: i64,
    url: String,
    target: PathBuf,
    resume: bool,
) -> Result<(), AppError> {
    Transfer::begin(app, id, url, target, resume)
}
