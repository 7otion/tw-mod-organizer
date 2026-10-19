use serde::Serialize;
use tauri::AppHandle;

use crate::error::AppError;
#[cfg(windows)]
use crate::process::windowless_command;
use crate::s7forge;

#[derive(Serialize)]
pub struct SteamStatus {
    is_installed: bool,
    is_running: bool,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn steam_status(app: AppHandle) -> Result<SteamStatus, AppError> {
    let libraries = s7forge::steam::steam_library_paths(&app)
        .await
        .inspect_err(|error| tracing::debug!("no Steam libraries: {error}"))
        .unwrap_or_default();
    let is_running = tauri::async_runtime::spawn_blocking(is_running)
        .await
        .map_err(|error| AppError::Custom(error.to_string()))??;
    Ok(SteamStatus {
        is_installed: !libraries.is_empty(),
        is_running,
    })
}

#[cfg(windows)]
fn is_running() -> Result<bool, AppError> {
    let output = windowless_command("tasklist")
        .args(["/FI", "IMAGENAME eq steam.exe", "/FO", "CSV", "/NH"])
        .output()?;
    Ok(String::from_utf8_lossy(&output.stdout)
        .to_ascii_lowercase()
        .contains("\"steam.exe\""))
}

#[cfg(not(windows))]
fn is_running() -> Result<bool, AppError> {
    unimplemented!("telling whether Steam is running on this platform")
}
