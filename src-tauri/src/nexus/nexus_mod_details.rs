use serde::{Deserialize, Serialize};

use super::{API, client, fetch_json};
use crate::error::AppError;

const GRAPHQL: &str = "https://api.nexusmods.com/v2/graphql";
const TAGS_QUERY: &str =
    "query Tags($ids: [CompositeIdInput!]!) { legacyMods(ids: $ids) { nodes { tags { name } } } }";

#[derive(Deserialize, Serialize)]
pub struct ModDetails {
    name: String,
    game_id: u32,
    summary: Option<String>,
    description: Option<String>,
    version: Option<String>,
    created_timestamp: i64,
    updated_timestamp: i64,
    author: Option<String>,
    uploaded_by: Option<String>,
    picture_url: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Serialize)]
struct TagsRequest {
    query: &'static str,
    variables: TagsVariables,
}

#[derive(Serialize)]
struct TagsVariables {
    ids: [CompositeId; 1],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CompositeId {
    game_id: u32,
    mod_id: u32,
}

#[derive(Deserialize)]
struct TagsReply {
    data: Option<TagsData>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TagsData {
    legacy_mods: TagsPage,
}

#[derive(Deserialize)]
struct TagsPage {
    nodes: Vec<TaggedMod>,
}

#[derive(Deserialize)]
struct TaggedMod {
    tags: Vec<Tag>,
}

#[derive(Deserialize)]
struct Tag {
    name: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn nexus_mod_details(
    api_key: String,
    domain: String,
    mod_id: u32,
) -> Result<ModDetails, AppError> {
    let client = client(&api_key)?;
    let mut details: ModDetails =
        fetch_json(&client, &format!("{API}/games/{domain}/mods/{mod_id}.json")).await?;
    match tags_of(&client, details.game_id, mod_id).await {
        Ok(tags) => details.tags = tags,
        Err(error) => tracing::warn!("couldn't read Nexus tags for mod {mod_id}: {error}"),
    }
    Ok(details)
}

async fn tags_of(
    client: &reqwest::Client,
    game_id: u32,
    mod_id: u32,
) -> Result<Vec<String>, AppError> {
    let request = TagsRequest {
        query: TAGS_QUERY,
        variables: TagsVariables {
            ids: [CompositeId { game_id, mod_id }],
        },
    };
    let response = client.post(GRAPHQL).json(&request).send().await?;
    let status = response.status();
    if !status.is_success() {
        return Err(AppError::Custom(format!("GraphQL answered {status}")));
    }
    let reply: TagsReply = response.json().await?;
    Ok(reply
        .data
        .map(|data| data.legacy_mods.nodes)
        .unwrap_or_default()
        .into_iter()
        .flat_map(|node| node.tags)
        .map(|tag| tag.name)
        .collect())
}
