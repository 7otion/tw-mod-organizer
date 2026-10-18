#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
use std::process::Command;

use serde::Serialize;
use tauri::AppHandle;

use crate::error::AppError;
use crate::s7forge;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Serialize)]
pub struct SteamStatus {
    is_installed: bool,
    is_running: bool,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn steam_status(app: AppHandle) -> Result<SteamStatus, AppError> {
    let libraries = s7forge::run::<Vec<String>>(&app, vec!["steam-library-paths".to_owned()])
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
    let output = Command::new("tasklist")
        .args(["/FI", "IMAGENAME eq steam.exe", "/FO", "CSV", "/NH"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()?;
    Ok(String::from_utf8_lossy(&output.stdout)
        .to_ascii_lowercase()
        .contains("\"steam.exe\""))
}

#[cfg(not(windows))]
fn is_running() -> Result<bool, AppError> {
    unimplemented!("telling whether Steam is running on this platform")
}
