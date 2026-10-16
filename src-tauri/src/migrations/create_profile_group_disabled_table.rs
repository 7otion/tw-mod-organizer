use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateProfileGroupDisabledTable;

impl Migration for CreateProfileGroupDisabledTable {
    const NAME: &'static str = "create_profile_group_disabled_table";

    fn up(schema: &mut Schema) {
        schema.create("profile_group_disabled", |table| {
            table.integer("profile_id").references("profiles");
            table.integer("group_id").references("groups");
            table.integer("mod_id").references("mods");
            table.primary(&["profile_id", "group_id", "mod_id"]);
        });
    }
}
