use serde::Serialize;
use tauri::AppHandle;

use super::{GAMES, GameInfo};
use crate::s7forge;

#[derive(Serialize)]
pub struct DetectedGame {
    #[serde(flatten)]
    game: GameInfo,
    detected_path: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn list_games(app: AppHandle) -> Vec<DetectedGame> {
    let mut games = Vec::with_capacity(GAMES.len());
    for game in GAMES {
        let game = game.info();
        let detected_path = s7forge::steam::app_installation_path(&app, game.app_id)
            .await
            .inspect_err(|error| tracing::debug!(app_id = game.app_id, "not detected: {error}"))
            .ok();
        games.push(DetectedGame {
            game,
            detected_path,
        });
    }
    games
}
