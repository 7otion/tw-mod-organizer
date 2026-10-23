use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};

use crate::error::AppError;

pub mod connect_nexus;
mod link;
pub mod nexus_download_url;
pub mod nexus_mod_details;
pub mod resolve_nxm_link;
pub mod set_nxm_handler;
mod sso;

pub const NXM_SCHEME: &str = "nxm";

pub const API: &str = "https://api.nexusmods.com/v1";

#[derive(Serialize)]
pub struct NexusAccount {
    pub api_key: String,
    pub user_name: String,
    pub is_premium: bool,
}

#[derive(Deserialize)]
struct ValidatedUser {
    name: String,
    is_premium: bool,
}

pub fn client(api_key: &str) -> Result<reqwest::Client, AppError> {
    let mut headers = HeaderMap::new();
    headers.insert(
        "apikey",
        HeaderValue::from_str(api_key).map_err(|error| AppError::Custom(error.to_string()))?,
    );
    headers.insert("accept", HeaderValue::from_static("application/json"));
    Ok(reqwest::Client::builder()
        .default_headers(headers)
        .user_agent(concat!("TWModOrganizer/", env!("CARGO_PKG_VERSION")))
        .build()?)
}

pub async fn validate(api_key: &str) -> Result<NexusAccount, AppError> {
    let response = client(api_key)?
        .get(format!("{API}/users/validate.json"))
        .send()
        .await?;
    if !response.status().is_success() {
        return Err(AppError::Custom(format!(
            "Nexus Mods rejected the key: {}",
            response.status()
        )));
    }
    let user: ValidatedUser = response.json().await?;
    Ok(NexusAccount {
        api_key: api_key.to_owned(),
        user_name: user.name,
        is_premium: user.is_premium,
    })
}

pub async fn fetch_json<T: serde::de::DeserializeOwned>(
    client: &reqwest::Client,
    url: &str,
) -> Result<T, AppError> {
    let response = client.get(url).send().await?;
    let status = response.status();
    if !status.is_success() {
        let detail = response.text().await.unwrap_or_default();
        return Err(AppError::Custom(describe_failure(status, &detail)));
    }
    Ok(response.json().await?)
}

pub fn describe_failure(status: reqwest::StatusCode, detail: &str) -> String {
    #[derive(Deserialize)]
    struct Failure {
        message: Option<String>,
    }
    let message = serde_json::from_str::<Failure>(detail)
        .ok()
        .and_then(|failure| failure.message)
        .unwrap_or_else(|| status.to_string());
    format!("Nexus Mods: {message}")
}
