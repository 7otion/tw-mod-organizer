use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateGroupMembersTable;

impl Migration for CreateGroupMembersTable {
    const NAME: &'static str = "create_group_members_table";

    fn up(schema: &mut Schema) {
        schema.create("group_members", |table| {
            table.integer("group_id").references("groups");
            table.integer("mod_id").references("mods");
            table.primary(&["group_id", "mod_id"]);
            table.text("position");
            table.unique(&["group_id", "position"]);
        });
    }
}
