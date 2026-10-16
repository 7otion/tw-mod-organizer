mod migrations;

use tauri::{AppHandle, Emitter};
use tracing_subscriber::EnvFilter;
use tracing_subscriber::fmt;
use tracing_subscriber::prelude::*;

pub const APP_IDENTIFIER: &str = "tw-mod-organizer.v2";

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
            tauri_plugin_7otion_sqlite::Builder::new()
                .migrations("app", migrations::app())
                .build(),
        )
        .setup(|app| {
            install_panic_hook(app.handle().clone());
            tracing::info!("Tauri setup complete");
            Ok(())
        })
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
