use tauri::AppHandle;

use super::detection::{self, DetectedGame};

#[tauri::command(rename_all = "snake_case")]
pub async fn detect_games(app: AppHandle) -> Vec<DetectedGame> {
    detection::detect_and_cache(&app).await
}
