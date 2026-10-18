use crate::error::AppError;

#[tauri::command(rename_all = "snake_case")]
pub async fn latest_s7forge_version() -> Result<String, AppError> {
    let client = super::client()?;
    Ok(super::latest_release(&client).await?.version())
}
