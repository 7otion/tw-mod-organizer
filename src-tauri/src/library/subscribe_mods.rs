use serde::Serialize;
use tauri::AppHandle;

use crate::error::AppError;
use crate::s7forge::workshop;

#[derive(Default, Serialize)]
pub struct SubscribedMods {
    subscribed: Vec<u64>,
    failures: Vec<SubscribeFailure>,
}

#[derive(Serialize)]
pub struct SubscribeFailure {
    item_id: u64,
    reason: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn subscribe_mods(
    app: AppHandle,
    app_id: u32,
    item_ids: Vec<u64>,
) -> Result<SubscribedMods, AppError> {
    let mut subscribed = SubscribedMods::default();
    for result in workshop::subscribe(&app, app_id, &item_ids).await? {
        if result.success {
            subscribed.subscribed.push(result.item_id);
            continue;
        }
        subscribed.failures.push(SubscribeFailure {
            item_id: result.item_id,
            reason: result.error.unwrap_or_else(|| "unknown error".to_owned()),
        });
    }
    Ok(subscribed)
}
