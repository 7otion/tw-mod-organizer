use tauri::State;

use super::install_mod::Installs;

#[tauri::command(rename_all = "snake_case")]
pub fn cancel_install(installs: State<'_, Installs>) {
    installs.cancel();
}
