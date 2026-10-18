use std::io::Write;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::error::AppError;

const PROGRESS_EVENT: &str = "s7forge-download-progress";

#[derive(Clone, Serialize)]
struct DownloadProgress {
    received: u64,
    total: u64,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn install_s7forge(app: AppHandle) -> Result<String, AppError> {
    let client = super::client()?;
    let release = super::latest_release(&client).await?;
    let version = release.version();
    let assets = super::assets()
        .iter()
        .map(|name| {
            release
                .assets
                .iter()
                .find(|asset| asset.name == *name)
                .ok_or_else(|| {
                    AppError::Custom(format!("The latest s7forge release has no {name}."))
                })
        })
        .collect::<Result<Vec<_>, _>>()?;

    let folder = super::folder(&app)?;
    let staging = folder.join("download");
    if staging.exists() {
        std::fs::remove_dir_all(&staging)?;
    }
    std::fs::create_dir_all(&staging)?;

    let total = assets.iter().map(|asset| asset.size).sum();
    let mut received = 0;
    for asset in &assets {
        let mut response = client
            .get(&asset.browser_download_url)
            .send()
            .await?
            .error_for_status()?;
        let mut file = std::fs::File::create(staging.join(&asset.name))?;
        let mut written = 0;
        while let Some(chunk) = response.chunk().await? {
            file.write_all(&chunk)?;
            written += chunk.len() as u64;
            received += chunk.len() as u64;
            let _ = app.emit(PROGRESS_EVENT, DownloadProgress { received, total });
        }
        if written != asset.size {
            return Err(AppError::Custom(format!(
                "{} arrived incomplete: {written} of {} bytes.",
                asset.name, asset.size
            )));
        }
    }

    let reported = super::installed_version(staging.clone()).await?;
    if reported.as_deref() != Some(version.as_str()) {
        return Err(AppError::Custom(format!(
            "The downloaded s7forge reports version {}, but the release is {version}.",
            reported.as_deref().unwrap_or("nothing")
        )));
    }

    for name in super::assets() {
        std::fs::rename(staging.join(name), folder.join(name))?;
    }
    std::fs::remove_dir(&staging)?;
    Ok(version)
}
