#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Network error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("{0}")]
    Tauri(#[from] tauri::Error),
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("{0}")]
    Sqlite(#[from] tauri_plugin_7otion_sqlite::Error),
    #[error("Couldn't move to the Recycle Bin: {0}")]
    Trash(#[from] trash::Error),
    #[error("Image error: {0}")]
    Image(#[from] image::ImageError),
    #[error("Unexpected data: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Not a valid TOML file: {0}")]
    Toml(#[from] toml::de::Error),
    #[error("{0}")]
    Custom(String),
}

impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
