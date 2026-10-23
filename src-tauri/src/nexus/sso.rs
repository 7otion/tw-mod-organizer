use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_opener::OpenerExt;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;

use crate::error::AppError;

const SSO_SOCKET: &str = "wss://sso.nexusmods.com";
const SSO_PAGE: &str = "https://www.nexusmods.com/sso";
const APPLICATION: &str = "tww";
const PROTOCOL: u8 = 2;
pub const URL_EVENT: &str = "nexus-sso-url";

#[derive(Serialize)]
struct Request<'a> {
    id: &'a str,
    token: Option<&'a str>,
    protocol: u8,
}

#[derive(Deserialize)]
struct Reply {
    success: Option<bool>,
    error: Option<String>,
    data: Option<ReplyData>,
}

#[derive(Deserialize)]
struct ReplyData {
    connection_token: Option<String>,
    api_key: Option<String>,
}

pub struct SsoSession {
    app: AppHandle,
    id: String,
}

impl SsoSession {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            id: Uuid::new_v4().to_string(),
        }
    }

    pub async fn api_key(&self) -> Result<String, AppError> {
        let (stream, _) = connect_async(SSO_SOCKET)
            .await
            .map_err(|error| AppError::Custom(format!("Couldn't reach Nexus Mods: {error}")))?;
        let (mut write, mut read) = stream.split();
        let request = serde_json::to_string(&Request {
            id: &self.id,
            token: None,
            protocol: PROTOCOL,
        })?;
        write
            .send(Message::Text(request.into()))
            .await
            .map_err(|error| AppError::Custom(error.to_string()))?;
        let mut is_browser_open = false;
        while let Some(message) = read.next().await {
            let message = message.map_err(|error| AppError::Custom(error.to_string()))?;
            let Message::Text(text) = message else {
                continue;
            };
            let reply: Reply = serde_json::from_str(&text)?;
            if reply.success == Some(false) {
                return Err(AppError::Custom(
                    reply
                        .error
                        .unwrap_or_else(|| "Nexus Mods refused the sign-in".to_owned()),
                ));
            }
            let Some(data) = reply.data else {
                continue;
            };
            if data.connection_token.is_some() && !is_browser_open {
                self.open_browser()?;
                is_browser_open = true;
            }
            if let Some(api_key) = data.api_key {
                let _ = write.close().await;
                return Ok(api_key);
            }
        }
        Err(AppError::Custom(
            "Nexus Mods closed the connection before approving".to_owned(),
        ))
    }

    fn open_browser(&self) -> Result<(), AppError> {
        let url = format!("{SSO_PAGE}?id={}&application={APPLICATION}", self.id);
        self.app.emit(URL_EVENT, &url)?;
        self.app
            .opener()
            .open_url(&url, None::<&str>)
            .map_err(|error| AppError::Custom(error.to_string()))
    }
}
