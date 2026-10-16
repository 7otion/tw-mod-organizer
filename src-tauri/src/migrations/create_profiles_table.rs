use tauri_plugin_7otion_sqlite::migrate::{DateStorage, Migration, Schema};

pub struct CreateProfilesTable;

impl Migration for CreateProfilesTable {
    const NAME: &'static str = "create_profiles_table";

    fn up(schema: &mut Schema) {
        schema.create("profiles", |table| {
            table.id();
            table.integer("game_id").references("games");
            table.text("name");
            table.text("position");
            table.date("created_at", DateStorage::Unix).default_now();
            table.date("last_used_at", DateStorage::Unix).nullable();
            table.unique(&["game_id", "name"]);
            table.unique(&["game_id", "position"]);
        });
        schema.alter("games", |table| {
            table
                .integer("active_profile_id")
                .nullable()
                .references("profiles");
        });
    }
}
