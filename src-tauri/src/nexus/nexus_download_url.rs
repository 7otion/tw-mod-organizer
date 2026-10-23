use serde::Deserialize;

use super::{API, client};
use crate::error::AppError;

#[derive(Deserialize)]
struct DownloadLink {
    #[serde(rename = "URI")]
    uri: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn nexus_download_url(
    api_key: String,
    domain: String,
    mod_id: u32,
    file_id: u32,
    key: Option<String>,
    expires: Option<i64>,
) -> Result<String, AppError> {
    let client = client(&api_key)?;
    let mut url = format!("{API}/games/{domain}/mods/{mod_id}/files/{file_id}/download_link.json");
    let mut parameters = Vec::new();
    if let Some(key) = key {
        parameters.push(format!("key={key}"));
    }
    if let Some(expires) = expires {
        parameters.push(format!("expires={expires}"));
    }
    if !parameters.is_empty() {
        url.push('?');
        url.push_str(&parameters.join("&"));
    }
    let response = client.get(url).send().await?;
    let status = response.status();
    if !status.is_success() {
        let detail = response.text().await.unwrap_or_default();
        return Err(AppError::Custom(super::describe_failure(status, &detail)));
    }
    let links: Vec<DownloadLink> = response.json().await?;
    links
        .into_iter()
        .next()
        .map(|link| link.uri)
        .ok_or_else(|| AppError::Custom("Nexus Mods offered no download server.".to_owned()))
}
