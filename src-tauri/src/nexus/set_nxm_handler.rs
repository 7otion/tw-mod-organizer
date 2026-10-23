use tauri::AppHandle;
use tauri_plugin_deep_link::DeepLinkExt;

use super::NXM_SCHEME;
use crate::error::AppError;

#[tauri::command(rename_all = "snake_case")]
pub fn set_nxm_handler(app: AppHandle, enabled: bool) -> Result<(), AppError> {
    let deep_link = app.deep_link();
    let result = if enabled {
        deep_link.register(NXM_SCHEME)
    } else {
        deep_link.unregister(NXM_SCHEME)
    };
    result.map_err(|error| AppError::Custom(error.to_string()))
}
