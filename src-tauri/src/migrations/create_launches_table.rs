use tauri_plugin_7otion_sqlite::migrate::{DateStorage, Migration, Schema};

pub struct CreateLaunchesTable;

impl Migration for CreateLaunchesTable {
    const NAME: &'static str = "create_launches_table";

    fn up(schema: &mut Schema) {
        schema.create("launches", |table| {
            table.id();
            table.integer("game_id").references("games");
            table
                .integer("profile_id")
                .nullable()
                .references("profiles");
            table.text("profile_name").nullable();
            table.date("started_at", DateStorage::Unix).default_now();
            table.date("ended_at", DateStorage::Unix).nullable();
            table.text("loaded_save").nullable();
        });
    }
}
