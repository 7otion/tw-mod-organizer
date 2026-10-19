use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Deserialize;
use serde::de::DeserializeOwned;
use tauri::{AppHandle, Manager};

use crate::error::AppError;
#[cfg(windows)]
use crate::process::windowless_command;

pub mod install_s7forge;
pub mod latest_s7forge_version;
pub mod s7forge_installed;
pub mod s7forge_version;
pub mod steam;
pub mod workshop;

const LATEST_RELEASE: &str = "https://api.github.com/repos/7otion/s7forge/releases/latest";
const CACHE_ENV: &str = "S7FORGE_CACHE_DIR";

#[derive(Deserialize)]
struct Release {
    tag_name: String,
    assets: Vec<Asset>,
}

#[derive(Deserialize)]
struct Asset {
    name: String,
    size: u64,
    browser_download_url: String,
}

impl Release {
    fn version(&self) -> String {
        self.tag_name.trim_start_matches('v').to_owned()
    }
}

fn client() -> Result<reqwest::Client, AppError> {
    Ok(reqwest::Client::builder()
        .user_agent("tw-mod-organizer")
        .build()?)
}

async fn latest_release(client: &reqwest::Client) -> Result<Release, AppError> {
    Ok(client
        .get(LATEST_RELEASE)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?)
}
#[cfg(windows)]
fn assets() -> [&'static str; 2] {
    ["s7forge.exe", "steam_api64.dll"]
}

#[cfg(not(windows))]
fn assets() -> [&'static str; 2] {
    unimplemented!("s7forge release assets for this platform")
}

#[cfg(windows)]
fn command(folder: &Path) -> Command {
    windowless_command(folder.join(assets()[0]))
}

#[cfg(not(windows))]
fn command(_folder: &Path) -> Command {
    unimplemented!("running s7forge on this platform")
}

fn folder(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(app.path().app_data_dir()?.join("s7forge"))
}

async fn run<T: DeserializeOwned>(app: &AppHandle, args: Vec<String>) -> Result<T, AppError> {
    let folder = folder(app)?;
    let cache = app.path().app_cache_dir()?.join("s7forge");
    let output = tauri::async_runtime::spawn_blocking(move || {
        command(&folder).args(args).env(CACHE_ENV, cache).output()
    })
    .await
    .map_err(|error| AppError::Custom(error.to_string()))??;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Custom(
            message.trim().trim_start_matches("Error: ").to_owned(),
        ));
    }
    Ok(serde_json::from_slice(&output.stdout)?)
}

fn version_in(folder: &Path) -> Option<String> {
    let output = command(folder).arg("--version").output().ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8_lossy(&output.stdout)
        .trim()
        .strip_prefix("s7forge ")
        .map(str::to_owned)
}

async fn installed_version(folder: PathBuf) -> Result<Option<String>, AppError> {
    tauri::async_runtime::spawn_blocking(move || version_in(&folder))
        .await
        .map_err(|error| AppError::Custom(error.to_string()))
}

fn with_app_id(command: &str, app_id: u32) -> Vec<String> {
    vec![
        command.to_owned(),
        "--app-id".to_owned(),
        app_id.to_string(),
    ]
}
