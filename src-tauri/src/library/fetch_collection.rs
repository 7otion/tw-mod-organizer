use serde::Serialize;
use tauri::AppHandle;

use crate::error::AppError;
use crate::s7forge::workshop::{self, WorkshopItem};

#[derive(Serialize)]
pub struct Collection {
    source_ref: String,
    title: String,
    author_name: String,
    author_ref: String,
    preview_url: Option<String>,
    updated_at: u64,
    items: Vec<CollectionItem>,
}

#[derive(Serialize)]
pub struct CollectionItem {
    source_ref: String,
    title: String,
    size_bytes: u64,
    preview_url: Option<String>,
    is_subscribed: bool,
    kind: ItemKind,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ItemKind {
    Mod,
    Collection,
    OtherGame,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn fetch_collection(
    app: AppHandle,
    app_id: u32,
    collection_id: u64,
) -> Result<Collection, AppError> {
    let collection = workshop::collection_items(&app, app_id, collection_id).await?;
    let details = collection.details;
    Ok(Collection {
        source_ref: details.id.to_string(),
        title: details.title,
        author_name: details.creator_name,
        author_ref: details.creator_id,
        preview_url: details.preview_url,
        updated_at: details.time_updated,
        items: collection
            .items
            .into_iter()
            .map(|item| collection_item(app_id, item))
            .collect(),
    })
}

fn collection_item(app_id: u32, item: WorkshopItem) -> CollectionItem {
    let kind = if item.file_type == "Collection" {
        ItemKind::Collection
    } else if item
        .consumer_steam_game_id
        .is_some_and(|consumer| consumer != app_id)
    {
        ItemKind::OtherGame
    } else {
        ItemKind::Mod
    };
    CollectionItem {
        source_ref: item.published_file_id.to_string(),
        title: item.title,
        size_bytes: item.file_size,
        preview_url: item.preview_url,
        is_subscribed: item.state.subscribed,
        kind,
    }
}
