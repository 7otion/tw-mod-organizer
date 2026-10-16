use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateTagsTable;

impl Migration for CreateTagsTable {
    const NAME: &'static str = "create_tags_table";

    fn up(schema: &mut Schema) {
        schema.create("tags", |table| {
            table.id();
            table.integer("game_id").references("games");
            table.text("name");
            table.text("color").nullable();
            table.unique(&["game_id", "name"]);
        });
    }
}
