use tauri::AppHandle;

use crate::error::AppError;

#[tauri::command(rename_all = "snake_case")]
pub async fn s7forge_version(app: AppHandle) -> Result<Option<String>, AppError> {
    super::installed_version(super::folder(&app)?).await
}
