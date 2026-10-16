use tauri_plugin_7otion_sqlite::migrate::{DateStorage, Migration, Schema};

pub struct CreateSavesTable;

impl Migration for CreateSavesTable {
    const NAME: &'static str = "create_saves_table";

    fn up(schema: &mut Schema) {
        schema.create("saves", |table| {
            table.id();
            table.integer("game_id").references("games");
            table.text("file_name");
            table.json("metadata").nullable();
            table.integer("size_bytes");
            table.date("modified_at", DateStorage::Unix);
            table.integer("launch_id").nullable().references("launches");
            table.unique(&["game_id", "file_name"]);
        });
    }
}
