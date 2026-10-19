use std::path::PathBuf;

use sqlx::{Row, SqliteConnection};
use tauri::{AppHandle, Manager};
use tauri_plugin_7otion_sqlite::SqliteExt;

use crate::error::AppError;

pub mod move_folder;

pub async fn ensure_folders(app: &AppHandle) -> Result<(), AppError> {
    let defaults = app.path().app_data_dir()?;
    let folders = with_database(app, async |connection: &mut SqliteConnection| {
        let row = sqlx::query("SELECT mods_dir, downloads_dir FROM settings WHERE id = 1")
            .fetch_optional(&mut *connection)
            .await?;
        if let Some(row) = row {
            return Ok([row.try_get("mods_dir")?, row.try_get("downloads_dir")?]);
        }
        let folders = [defaults.join("mods"), defaults.join("downloads")]
            .map(|folder| folder.to_string_lossy().into_owned());
        sqlx::query("INSERT INTO settings (id, mods_dir, downloads_dir) VALUES (1, ?, ?)")
            .bind(&folders[0])
            .bind(&folders[1])
            .execute(&mut *connection)
            .await?;
        Ok(folders)
    })
    .await?;

    for folder in folders {
        std::fs::create_dir_all(folder)?;
    }
    Ok(())
}

pub async fn mods_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    with_database(app, async |connection: &mut SqliteConnection| {
        let row = sqlx::query("SELECT mods_dir FROM settings WHERE id = 1")
            .fetch_one(&mut *connection)
            .await?;
        Ok(PathBuf::from(row.try_get::<String, _>("mods_dir")?))
    })
    .await
}

async fn with_database<T>(
    app: &AppHandle,
    work: impl AsyncFnOnce(&mut SqliteConnection) -> Result<T, AppError>,
) -> Result<T, AppError> {
    let database = app
        .sqlite()
        .load(crate::DATABASE, Some("app"), None)
        .await?;
    let result = async {
        let mut connection = database.lock().await?;
        work(&mut connection).await
    }
    .await;
    if let Err(error) = app.sqlite().release(database.id()).await {
        tracing::error!(%error, "could not release the database");
    }
    result
}
