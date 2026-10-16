use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateGroupsTable;

impl Migration for CreateGroupsTable {
    const NAME: &'static str = "create_groups_table";

    fn up(schema: &mut Schema) {
        schema.create("groups", |table| {
            table.id();
            table.integer("game_id").references("games");
            table.text("name");
            table.text("color").nullable();
            table.text("position");
            table.text("steam_collection_id").nullable();
            table.unique(&["game_id", "name"]);
            table.unique(&["game_id", "position"]);
        });
    }
}
