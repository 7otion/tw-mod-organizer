use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::{GAMES, GameInfo};
use crate::error::AppError;
use crate::s7forge;

const CACHE_FILE: &str = "detected_games.json";

type DetectedPaths = HashMap<u32, Option<String>>;

#[derive(Serialize)]
pub struct DetectedGame {
    #[serde(flatten)]
    game: GameInfo,
    detected_path: Option<String>,
}

pub fn cached_games(app: &AppHandle) -> Option<Vec<DetectedGame>> {
    let file = cache_file(app).ok()?;
    let paths: DetectedPaths = serde_json::from_slice(&fs::read(file).ok()?).ok()?;
    Some(games_with(&paths))
}

pub async fn detect_and_cache(app: &AppHandle) -> Vec<DetectedGame> {
    let mut lookups = Vec::with_capacity(GAMES.len());
    for game in GAMES {
        let app = app.clone();
        let app_id = game.info().app_id;
        lookups.push(tauri::async_runtime::spawn(async move {
            let path = s7forge::steam::app_installation_path(&app, app_id)
                .await
                .inspect_err(|error| tracing::debug!(app_id, "not detected: {error}"))
                .ok();
            (app_id, path)
        }));
    }
    let mut paths = DetectedPaths::with_capacity(lookups.len());
    for lookup in lookups {
        match lookup.await {
            Ok((app_id, path)) => {
                paths.insert(app_id, path);
            }
            Err(error) => tracing::warn!("game detection failed: {error}"),
        }
    }
    if let Err(error) = save(app, &paths) {
        tracing::debug!("couldn't cache detected games: {error}");
    }
    games_with(&paths)
}

fn games_with(paths: &DetectedPaths) -> Vec<DetectedGame> {
    let mut games = Vec::with_capacity(GAMES.len());
    for game in GAMES {
        let game = game.info();
        games.push(DetectedGame {
            detected_path: paths.get(&game.app_id).cloned().flatten(),
            game,
        });
    }
    games
}

fn save(app: &AppHandle, paths: &DetectedPaths) -> Result<(), AppError> {
    let file = cache_file(app)?;
    if let Some(folder) = file.parent() {
        fs::create_dir_all(folder)?;
    }
    fs::write(file, serde_json::to_vec(paths)?)?;
    Ok(())
}

fn cache_file(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(app.path().app_cache_dir()?.join(CACHE_FILE))
}
