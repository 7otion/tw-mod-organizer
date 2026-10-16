use tauri_plugin_7otion_sqlite::migrate::{DateStorage, Migration, Schema};

pub struct CreateGamesTable;

impl Migration for CreateGamesTable {
    const NAME: &'static str = "create_games_table";

    fn up(schema: &mut Schema) {
        schema.create("games", |table| {
            table.integer("app_id");
            table.primary(&["app_id"]);
            table.text("install_path").nullable();
            table.text("pin_position").nullable();
            table.date("last_opened_at", DateStorage::Unix).nullable();
            table.date("scanned_at", DateStorage::Unix).nullable();
            table.date("created_at", DateStorage::Unix).default_now();
            table.unique(&["pin_position"]);
        });
    }
}
