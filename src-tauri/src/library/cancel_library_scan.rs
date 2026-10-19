use tauri::State;

use super::scan_library::LibraryScans;

#[tauri::command(rename_all = "snake_case")]
pub fn cancel_library_scan(scans: State<'_, LibraryScans>, app_id: u32) {
    scans.cancel(app_id);
}
