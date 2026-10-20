use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use super::{run, with_app_id};
use crate::error::AppError;

#[derive(Deserialize)]
pub struct WorkshopItem {
    pub published_file_id: u64,
    pub creator_id: String,
    pub creator_name: String,
    pub title: String,
    pub description: String,
    pub time_created: u64,
    pub time_updated: u64,
    pub url: String,
    pub preview_url: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub required_items: Vec<u64>,
    #[serde(default)]
    pub file_type: String,
    #[serde(default)]
    pub file_size: u64,
    #[serde(default)]
    pub consumer_steam_game_id: Option<u32>,
    #[serde(default)]
    pub state: ItemState,
}

#[derive(Default, Deserialize)]
pub struct ItemState {
    pub subscribed: bool,
    pub installed: bool,
    pub needs_update: bool,
    pub downloading: bool,
    pub download_pending: bool,
}

#[derive(Deserialize)]
pub struct CollectionInfo {
    pub id: u64,
    pub title: String,
    pub creator_id: String,
    pub creator_name: String,
    pub preview_url: Option<String>,
    pub time_updated: u64,
}

#[derive(Deserialize)]
pub struct CollectionDetails {
    pub details: CollectionInfo,
    pub items: Vec<WorkshopItem>,
}

#[derive(Deserialize)]
pub struct DownloadProgress {
    pub item_id: u64,
    pub state: ItemState,
    pub downloaded_bytes: Option<u64>,
    pub total_bytes: Option<u64>,
    pub installed_time_updated: Option<u64>,
}

#[derive(Deserialize)]
pub struct DownloadRequest {
    pub item_id: u64,
    pub outcome: DownloadOutcome,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Clone, Copy, PartialEq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DownloadOutcome {
    Pending,
    Completed,
    Refused,
    Failed,
}

#[derive(Deserialize)]
pub struct WorkshopState {
    pub route: StateRoute,
    pub items: Vec<WorkshopStateItem>,
}

#[derive(Clone, Copy, PartialEq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StateRoute {
    Files,
    Steam,
    Folder,
}

#[derive(Deserialize)]
pub struct WorkshopStateItem {
    pub item_id: u64,
    pub installed: bool,
    pub folder: Option<PathBuf>,
    pub size_on_disk: Option<u64>,
    pub installed_time_updated: Option<u64>,
    pub latest_time_updated: Option<u64>,
    pub needs_update: bool,
    #[serde(default)]
    pub download_pending: bool,
}

#[derive(Deserialize, Serialize)]
pub struct SubscriptionTime {
    pub item_id: u64,
    pub time_subscribed: u64,
}

#[derive(Deserialize)]
pub struct ItemResult {
    pub item_id: u64,
    pub success: bool,
    pub error: Option<String>,
}

pub async fn workshop_state(app: &AppHandle, app_id: u32) -> Result<WorkshopState, AppError> {
    run(app, with_app_id("workshop-state", app_id)).await
}

pub async fn subscription_times(
    app: &AppHandle,
    app_id: u32,
) -> Result<Vec<SubscriptionTime>, AppError> {
    run(app, with_app_id("subscription-times", app_id)).await
}

pub async fn workshop_items(
    app: &AppHandle,
    app_id: u32,
    item_ids: &[u64],
) -> Result<Vec<WorkshopItem>, AppError> {
    if item_ids.is_empty() {
        return Ok(Vec::new());
    }
    run(app, with_item_ids("workshop-items", app_id, item_ids)).await
}

pub async fn collection_items(
    app: &AppHandle,
    app_id: u32,
    item_id: u64,
) -> Result<CollectionDetails, AppError> {
    let mut args = with_app_id("collection-items", app_id);
    args.push("--item-id".to_owned());
    args.push(item_id.to_string());
    run(app, args).await
}

pub async fn download_items(
    app: &AppHandle,
    app_id: u32,
    item_ids: &[u64],
) -> Result<Vec<DownloadRequest>, AppError> {
    if item_ids.is_empty() {
        return Ok(Vec::new());
    }
    run(app, with_item_ids("download-items", app_id, item_ids)).await
}

pub async fn download_progress(
    app: &AppHandle,
    app_id: u32,
    item_ids: &[u64],
) -> Result<Vec<DownloadProgress>, AppError> {
    if item_ids.is_empty() {
        return Ok(Vec::new());
    }
    run(app, with_item_ids("download-progress", app_id, item_ids)).await
}

pub async fn subscribe(
    app: &AppHandle,
    app_id: u32,
    item_ids: &[u64],
) -> Result<Vec<ItemResult>, AppError> {
    if item_ids.is_empty() {
        return Ok(Vec::new());
    }
    run(app, with_item_ids("subscribe", app_id, item_ids)).await
}

pub async fn unsubscribe(
    app: &AppHandle,
    app_id: u32,
    item_ids: &[u64],
) -> Result<Vec<ItemResult>, AppError> {
    if item_ids.is_empty() {
        return Ok(Vec::new());
    }
    run(app, with_item_ids("unsubscribe", app_id, item_ids)).await
}

fn with_item_ids(command: &str, app_id: u32, item_ids: &[u64]) -> Vec<String> {
    let mut ids = Vec::with_capacity(item_ids.len());
    for item_id in item_ids {
        ids.push(item_id.to_string());
    }
    let mut args = with_app_id(command, app_id);
    args.push("--item-ids".to_owned());
    args.push(ids.join(","));
    args
}
