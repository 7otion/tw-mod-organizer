use tauri_plugin_7otion_sqlite::migrate::Migrations;
use tauri_plugin_7otion_sqlite::migrations;

pub fn app() -> Migrations {
    migrations![]
}
