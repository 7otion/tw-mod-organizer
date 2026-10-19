use crate::error::AppError;
#[cfg(windows)]
use crate::process::windowless_command;

#[cfg(windows)]
const INTERNATIONAL_KEY: &str = r"HKCU\Control Panel\International";

#[tauri::command(rename_all = "snake_case")]
pub async fn system_date_pattern() -> Result<Option<String>, AppError> {
    tauri::async_runtime::spawn_blocking(read_short_date_pattern)
        .await
        .map_err(|error| AppError::Custom(error.to_string()))?
}

#[cfg(windows)]
fn read_short_date_pattern() -> Result<Option<String>, AppError> {
    let output = windowless_command("reg")
        .args(["query", INTERNATIONAL_KEY, "/v", "sShortDate"])
        .output()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout
        .lines()
        .find_map(|line| line.trim().strip_prefix("sShortDate"))
        .and_then(|value| value.trim().strip_prefix("REG_SZ"))
        .map(|pattern| pattern.trim().to_owned())
        .filter(|pattern| !pattern.is_empty()))
}

#[cfg(not(windows))]
fn read_short_date_pattern() -> Result<Option<String>, AppError> {
    unimplemented!("reading the system's short date format on this platform")
}
