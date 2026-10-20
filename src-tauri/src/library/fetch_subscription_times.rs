use tauri::AppHandle;

use crate::error::AppError;
use crate::s7forge::workshop::{self, SubscriptionTime};

#[tauri::command(rename_all = "snake_case")]
pub async fn fetch_subscription_times(
    app: AppHandle,
    app_id: u32,
) -> Result<Vec<SubscriptionTime>, AppError> {
    workshop::subscription_times(&app, app_id).await
}
