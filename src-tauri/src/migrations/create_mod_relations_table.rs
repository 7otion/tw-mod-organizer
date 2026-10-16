use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateModRelationsTable;

impl Migration for CreateModRelationsTable {
    const NAME: &'static str = "create_mod_relations_table";

    fn up(schema: &mut Schema) {
        schema.create("mod_relations", |table| {
            table.id();
            table.integer("mod_id").references("mods");
            table.text("kind");
            table.text("target_source");
            table.text("target_ref");
            table.text("target_title").nullable();
            table.boolean("optional").default(false);
            table.text("origin");
            table.index(&["target_source", "target_ref"]);
        });
    }
}
