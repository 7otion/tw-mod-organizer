use std::path::PathBuf;
use std::process::Command;

use tauri::AppHandle;

use crate::error::AppError;
use crate::settings;

#[tauri::command(rename_all = "snake_case")]
pub async fn open_in_rpfm(app: AppHandle, pack: PathBuf) -> Result<(), AppError> {
    let rpfm = settings::rpfm_path(&app)
        .await?
        .ok_or_else(|| AppError::Custom("Set the RPFM path in Settings first.".to_owned()))?;
    Command::new(rpfm).arg(pack).spawn()?;
    Ok(())
}
