use serde::Serialize;
use tauri::AppHandle;

use super::{GAMES, Game};
use crate::s7forge;

#[derive(Serialize)]
pub struct DetectedGame {
    #[serde(flatten)]
    game: Game,
    detected_path: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn list_games(app: AppHandle) -> Vec<DetectedGame> {
    let mut games = Vec::with_capacity(GAMES.len());
    for game in GAMES {
        let args = vec![
            "app-installation-path".to_owned(),
            "--app-id".to_owned(),
            game.app_id.to_string(),
        ];
        let detected_path = s7forge::run::<String>(&app, args)
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
