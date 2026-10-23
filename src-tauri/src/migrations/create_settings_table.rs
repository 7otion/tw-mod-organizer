use tauri_plugin_7otion_sqlite::migrate::{DateStorage, Migration, Schema};

pub struct CreateSettingsTable;

impl Migration for CreateSettingsTable {
    const NAME: &'static str = "create_settings_table";

    fn up(schema: &mut Schema) {
        schema.create("settings", |table| {
            table.integer("id");
            table.primary(&["id"]);
            table.text("mods_dir");
            table.text("downloads_dir");
            table.text("rpfm_path").nullable();
            table.text("nexus_api_key").nullable();
            table.text("nexus_user_name").nullable();
            table.boolean("preview_auto_sort").default(true);
            table.text("date_format").default("system");
            table.text("language").default("system");
            table
                .date("v1_import_offered_at", DateStorage::Unix)
                .nullable();
            table
                .integer("current_game_id")
                .nullable()
                .references("games");
        });
    }
}
