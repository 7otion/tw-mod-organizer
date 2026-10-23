use super::Transfer;

#[tauri::command(rename_all = "snake_case")]
pub fn pause_download(id: i64) -> bool {
    Transfer::pause(id)
}
