use tauri::AppHandle;

use super::{run, with_app_id};
use crate::error::AppError;

pub async fn app_installation_path(app: &AppHandle, app_id: u32) -> Result<String, AppError> {
    run(app, with_app_id("app-installation-path", app_id)).await
}

pub async fn steam_library_paths(app: &AppHandle) -> Result<Vec<String>, AppError> {
    run(app, vec!["steam-library-paths".to_owned()]).await
}
