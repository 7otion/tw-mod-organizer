use serde::Serialize;
use tauri::AppHandle;

use super::detection::{self, DetectedGame};

#[derive(Serialize)]
pub struct GameList {
    games: Vec<DetectedGame>,
    is_fresh: bool,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn list_games(app: AppHandle) -> GameList {
    match detection::cached_games(&app) {
        Some(games) => GameList {
            games,
            is_fresh: false,
        },
        None => GameList {
            games: detection::detect_and_cache(&app).await,
            is_fresh: true,
        },
    }
}
