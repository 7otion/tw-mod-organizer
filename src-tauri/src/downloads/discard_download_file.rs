use std::path::PathBuf;

use super::Transfer;
use crate::error::AppError;

#[tauri::command(rename_all = "snake_case")]
pub async fn discard_download_file(target: PathBuf) -> Result<(), AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        for path in [Transfer::part_path(&target), target] {
            if path.exists() {
                trash::delete(&path)?;
            }
        }
        Ok(())
    })
    .await
    .map_err(|error| AppError::Custom(error.to_string()))?
}
