use std::path::PathBuf;

use serde::Deserialize;
use tauri::AppHandle;

use super::{run, with_app_id};
use crate::error::AppError;

#[derive(Deserialize)]
pub struct WorkshopItem {
    pub published_file_id: u64,
    pub creator_id: String,
    pub creator_name: String,
    pub install: Option<Install>,
    pub title: String,
    pub description: String,
    pub time_created: u64,
    pub time_updated: u64,
    #[serde(default)]
    pub time_subscribed: Option<u64>,
    pub url: String,
    pub preview_url: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Deserialize)]
pub struct Install {
    pub folder: PathBuf,
    pub size_on_disk: u64,
    pub time_updated: u64,
}

#[derive(Deserialize)]
pub struct UnsubscribeResult {
    pub item_id: u64,
    pub success: bool,
    pub error: Option<String>,
}

pub async fn subscribed_items(app: &AppHandle, app_id: u32) -> Result<Vec<WorkshopItem>, AppError> {
    run(app, with_app_id("subscribed-items", app_id)).await
}

pub async fn workshop_path(app: &AppHandle, app_id: u32) -> Result<PathBuf, AppError> {
    run(app, with_app_id("workshop-path", app_id)).await
}

pub async fn unsubscribe(
    app: &AppHandle,
    app_id: u32,
    item_ids: &[u64],
) -> Result<Vec<UnsubscribeResult>, AppError> {
    if item_ids.is_empty() {
        return Ok(Vec::new());
    }
    let mut ids = Vec::with_capacity(item_ids.len());
    for item_id in item_ids {
        ids.push(item_id.to_string());
    }
    let mut args = with_app_id("unsubscribe", app_id);
    args.push("--item-ids".to_owned());
    args.push(ids.join(","));
    run(app, args).await
}
