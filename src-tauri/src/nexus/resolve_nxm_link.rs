use serde::{Deserialize, Serialize};

use super::link::NxmLink;
use super::{API, client};
use crate::error::AppError;

#[derive(Serialize)]
pub struct ResolvedLink {
    link: NxmLink,
    title: String,
    version: Option<String>,
    author_name: Option<String>,
    page_url: String,
    preview_url: Option<String>,
    file_name: String,
    total_bytes: Option<u64>,
    updated_at: i64,
}

#[derive(Deserialize)]
struct ModDetails {
    name: String,
    author: Option<String>,
    picture_url: Option<String>,
    updated_timestamp: i64,
}

#[derive(Deserialize)]
struct FileDetails {
    file_name: String,
    version: Option<String>,
    size_in_bytes: Option<u64>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn resolve_nxm_link(api_key: String, link: String) -> Result<ResolvedLink, AppError> {
    let link = NxmLink::parse(&link)?;
    let client = client(&api_key)?;
    let mod_url = format!("{API}/games/{}/mods/{}.json", link.domain, link.mod_id);
    let file_url = format!(
        "{API}/games/{}/mods/{}/files/{}.json",
        link.domain, link.mod_id, link.file_id
    );
    let details: ModDetails = super::fetch_json(&client, &mod_url).await?;
    let file: FileDetails = super::fetch_json(&client, &file_url).await?;
    Ok(ResolvedLink {
        page_url: format!(
            "https://www.nexusmods.com/{}/mods/{}",
            link.domain, link.mod_id
        ),
        link,
        title: details.name,
        version: file.version,
        author_name: details.author,
        preview_url: details.picture_url,
        file_name: file.file_name,
        total_bytes: file.size_in_bytes,
        updated_at: details.updated_timestamp,
    })
}
