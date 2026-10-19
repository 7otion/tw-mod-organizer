use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateModDependenciesTable;

impl Migration for CreateModDependenciesTable {
    const NAME: &'static str = "create_mod_dependencies_table";

    fn up(schema: &mut Schema) {
        schema.create("mod_dependencies", |table| {
            table.id();
            table.integer("mod_id").references("mods");
            table.text("required_ref");
            table.text("required_title").nullable();
            table.boolean("optional").default(false);
            table.text("origin");
            table.index(&["origin", "required_ref"]);
        });
    }
}
