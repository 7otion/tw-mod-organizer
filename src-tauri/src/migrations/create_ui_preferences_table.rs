use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateUiPreferencesTable;

impl Migration for CreateUiPreferencesTable {
    const NAME: &'static str = "create_ui_preferences_table";

    fn up(schema: &mut Schema) {
        schema.create("ui_preferences", |table| {
            table.text("key");
            table.primary(&["key"]);
            table.text("value");
        });
    }
}
