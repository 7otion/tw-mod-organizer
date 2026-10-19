mod error;
mod games;
mod languages;
mod library;
mod migrations;
#[cfg(windows)]
mod process;
mod s7forge;
mod settings;
mod steam;

use tauri::{AppHandle, Emitter};
use tauri_plugin_window_state::StateFlags;
use tracing_subscriber::EnvFilter;
use tracing_subscriber::fmt;
use tracing_subscriber::prelude::*;

pub const APP_IDENTIFIER: &str = "tw-mod-organizer.v2";
pub const DATABASE: &str = "twmodorganizer_v2.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let default_filter = if cfg!(debug_assertions) {
        "info,app_lib=debug"
    } else {
        "info"
    };
    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(default_filter));
    tracing_subscriber::registry()
        .with(filter)
        .with(
            fmt::layer()
                .with_target(true)
                .with_file(true)
                .with_line_number(true),
        )
        .init();

    tracing::info!("Starting {APP_IDENTIFIER}");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {
            tracing::debug!("A second instance was refused");
        }))
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED)
                .build(),
        )
        .plugin(
            tauri_plugin_7otion_sqlite::Builder::new()
                .migrations("app", migrations::app())
                .build(),
        )
        .manage(library::request_thumbnails::ThumbnailRequests::default())
        .manage(library::scan_library::LibraryScans::default())
        .setup(|app| {
            install_panic_hook(app.handle().clone());
            tauri::async_runtime::block_on(settings::ensure_folders(app.handle()))?;
            tracing::info!("Tauri setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            games::check_game_folder::check_game_folder,
            games::list_games::list_games,
            languages::export_language_template::export_language_template,
            languages::install_language_pack::install_language_pack,
            languages::list_language_packs::list_language_packs,
            languages::read_language_file::read_language_file,
            library::cancel_library_scan::cancel_library_scan,
            library::remove_mods::remove_mods,
            library::request_thumbnails::request_thumbnails,
            library::scan_library::scan_library,
            s7forge::install_s7forge::install_s7forge,
            s7forge::latest_s7forge_version::latest_s7forge_version,
            s7forge::s7forge_version::s7forge_version,
            settings::move_folder::move_folder,
            settings::system_date_pattern::system_date_pattern,
            steam::steam_status::steam_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn install_panic_hook(app: AppHandle) {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        previous(info);

        let payload = info
            .payload()
            .downcast_ref::<&str>()
            .map(|s| (*s).to_owned())
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "unknown panic".to_owned());
        let origin = info
            .location()
            .map(|l| format!("{}:{}", l.file(), l.line()))
            .unwrap_or_else(|| "unknown location".to_owned());

        tracing::error!(%origin, "backend panic: {payload}");
        let _ = app.emit("backend-panic", format!("{payload} ({origin})"));
    }));
}
