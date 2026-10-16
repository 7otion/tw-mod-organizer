use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateModTagsTable;

impl Migration for CreateModTagsTable {
    const NAME: &'static str = "create_mod_tags_table";

    fn up(schema: &mut Schema) {
        schema.create("mod_tags", |table| {
            table.integer("mod_id").references("mods");
            table.integer("tag_id").references("tags");
            table.primary(&["mod_id", "tag_id"]);
        });
    }
}
