use std::time::Duration;

use tauri::AppHandle;

use super::sso::SsoSession;
use super::{NexusAccount, validate};
use crate::error::AppError;

const APPROVAL_TIMEOUT: Duration = Duration::from_secs(300);

#[tauri::command(rename_all = "snake_case")]
pub async fn connect_nexus(app: AppHandle) -> Result<NexusAccount, AppError> {
    let session = SsoSession::new(app);
    let api_key = tokio::time::timeout(APPROVAL_TIMEOUT, session.api_key())
        .await
        .map_err(|_| {
            AppError::Custom("Nexus Mods didn't approve within five minutes.".to_owned())
        })??;
    validate(&api_key).await
}
