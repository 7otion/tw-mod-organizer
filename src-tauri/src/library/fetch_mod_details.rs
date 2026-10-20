use std::collections::HashMap;
use std::time::Instant;

use serde::Serialize;
use tauri::AppHandle;

use crate::error::AppError;
use crate::games::{self, GameSupport};
use crate::s7forge::workshop::{self, WorkshopItem};
use crate::steam::tags::tag_from_steam_tag;

#[derive(Serialize)]
pub struct ModDetails {
    source_ref: String,
    steam: SteamDetails,
}

#[derive(Serialize)]
struct SteamDetails {
    title: String,
    description: String,
    author_name: String,
    author_ref: String,
    page_url: String,
    preview_url: Option<String>,
    published_at: u64,
    remote_updated_at: u64,
    tags: Vec<String>,
    required: Vec<RequiredItem>,
}

#[derive(Serialize)]
struct RequiredItem {
    item_ref: String,
    title: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn fetch_mod_details(
    app: AppHandle,
    app_id: u32,
    item_ids: Vec<u64>,
) -> Result<Vec<ModDetails>, AppError> {
    let started = Instant::now();
    let game = games::find(app_id)?;
    let items = workshop::workshop_items(&app, app_id, &item_ids).await?;
    let titles = required_titles(&app, app_id, &items).await;
    let details = items
        .into_iter()
        .map(|item| ModDetails {
            source_ref: item.published_file_id.to_string(),
            steam: steam_details(game, item, &titles),
        })
        .collect::<Vec<_>>();
    tracing::info!(
        app_id,
        asked = item_ids.len(),
        found = details.len(),
        elapsed_ms = started.elapsed().as_millis() as u64,
        "mod details fetched"
    );
    Ok(details)
}

fn steam_details(
    game: &dyn GameSupport,
    item: WorkshopItem,
    required_titles: &HashMap<u64, String>,
) -> SteamDetails {
    let mut tags = Vec::new();
    for steam_tag in &item.tags {
        if let Some(tag) = tag_from_steam_tag(steam_tag, game.ignored_steam_tags()) {
            tags.push(tag);
        }
    }
    let mut required = Vec::with_capacity(item.required_items.len());
    for item_id in &item.required_items {
        required.push(RequiredItem {
            item_ref: item_id.to_string(),
            title: required_titles.get(item_id).cloned(),
        });
    }
    SteamDetails {
        title: item.title,
        description: item.description,
        author_name: item.creator_name,
        author_ref: item.creator_id,
        page_url: item.url,
        preview_url: item.preview_url,
        published_at: item.time_created,
        remote_updated_at: item.time_updated,
        tags,
        required,
    }
}

async fn required_titles(
    app: &AppHandle,
    app_id: u32,
    items: &[WorkshopItem],
) -> HashMap<u64, String> {
    let mut titles = HashMap::with_capacity(items.len());
    for item in items {
        titles.insert(item.published_file_id, item.title.clone());
    }
    let mut missing = Vec::new();
    for item in items {
        for item_id in &item.required_items {
            if !titles.contains_key(item_id) && !missing.contains(item_id) {
                missing.push(*item_id);
            }
        }
    }
    match workshop::workshop_items(app, app_id, &missing).await {
        Ok(found) => {
            for item in found {
                titles.insert(item.published_file_id, item.title);
            }
        }
        Err(error) => tracing::debug!(app_id, "no titles for missing requirements: {error}"),
    }
    titles
}
