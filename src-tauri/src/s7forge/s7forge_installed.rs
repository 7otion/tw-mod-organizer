use tauri::AppHandle;

use crate::error::AppError;

#[tauri::command(rename_all = "snake_case")]
pub fn s7forge_installed(app: AppHandle) -> Result<bool, AppError> {
    let folder = super::folder(&app)?;
    Ok(super::assets()
        .iter()
        .all(|asset| folder.join(asset).is_file()))
}
