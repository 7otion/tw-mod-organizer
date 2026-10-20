use serde::Serialize;
use tauri::AppHandle;

use crate::error::AppError;
use crate::s7forge::workshop::{self, DownloadOutcome};

#[derive(Serialize)]
pub struct UpdateRequest {
    source_ref: String,
    status: UpdateStatus,
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub enum UpdateStatus {
    Queued,
    UpToDate,
    UpdateFailed,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn force_update_mods(
    app: AppHandle,
    app_id: u32,
    item_ids: Vec<u64>,
) -> Result<Vec<UpdateRequest>, AppError> {
    let requests = workshop::download_items(&app, app_id, &item_ids).await?;
    Ok(requests
        .into_iter()
        .map(|request| UpdateRequest {
            source_ref: request.item_id.to_string(),
            status: match request.outcome {
                DownloadOutcome::Pending => UpdateStatus::Queued,
                DownloadOutcome::Completed => UpdateStatus::UpToDate,
                DownloadOutcome::Refused | DownloadOutcome::Failed => UpdateStatus::UpdateFailed,
            },
            error: request.error,
        })
        .collect())
}
