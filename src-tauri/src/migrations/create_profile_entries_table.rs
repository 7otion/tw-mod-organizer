use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateProfileEntriesTable;

impl Migration for CreateProfileEntriesTable {
    const NAME: &'static str = "create_profile_entries_table";

    fn up(schema: &mut Schema) {
        schema.create("profile_entries", |table| {
            table.id();
            table.integer("profile_id").references("profiles");
            table.text("position");
            table.boolean("enabled").default(true);
            table.boolean("collapsed").default(false);
            table.integer("mod_id").nullable().references("mods");
            table
                .integer("separator_id")
                .nullable()
                .unique()
                .references("separators");
            table.integer("group_id").nullable().references("groups");
            table.unique(&["profile_id", "position"]);
            table.unique(&["profile_id", "mod_id"]);
            table.unique(&["profile_id", "group_id"]);
        });
    }
}
