use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateLaunchEntriesTable;

impl Migration for CreateLaunchEntriesTable {
    const NAME: &'static str = "create_launch_entries_table";

    fn up(schema: &mut Schema) {
        schema.create("launch_entries", |table| {
            table.id();
            table.integer("launch_id").references("launches");
            table.integer("order_index");
            table.text("kind");
            table.boolean("enabled").default(true);
            table.integer("mod_id").nullable().references("mods");
            table.text("mod_source").nullable();
            table.text("mod_ref").nullable();
            table.integer("group_id").nullable().references("groups");
            table.integer("group_index").nullable();
            table.text("title");
            table.text("background_color").nullable();
            table.text("text_color").nullable();
            table.unique(&["launch_id", "order_index"]);
        });
    }
}
