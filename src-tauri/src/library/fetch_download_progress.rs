use serde::Serialize;
use tauri::AppHandle;

use crate::error::AppError;
use crate::s7forge::workshop;

#[derive(Serialize)]
pub struct ItemDownload {
    source_ref: String,
    status: DownloadStatus,
    downloaded_bytes: u64,
    total_bytes: Option<u64>,
    installed_updated_at: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DownloadStatus {
    Queued,
    Downloading,
    Installed,
    Unsubscribed,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn fetch_download_progress(
    app: AppHandle,
    app_id: u32,
    item_ids: Vec<u64>,
) -> Result<Vec<ItemDownload>, AppError> {
    let progress = workshop::download_progress(&app, app_id, &item_ids).await?;
    Ok(progress
        .into_iter()
        .map(|item| {
            let state = &item.state;
            let status = if !state.subscribed {
                DownloadStatus::Unsubscribed
            } else if state.downloading {
                DownloadStatus::Downloading
            } else if state.installed && !state.needs_update && !state.download_pending {
                DownloadStatus::Installed
            } else {
                DownloadStatus::Queued
            };
            ItemDownload {
                source_ref: item.item_id.to_string(),
                status,
                downloaded_bytes: item.downloaded_bytes.unwrap_or(0),
                total_bytes: item.total_bytes.filter(|total| *total > 0),
                installed_updated_at: item.installed_time_updated,
            }
        })
        .collect())
}
