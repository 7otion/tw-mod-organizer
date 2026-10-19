use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateUiStateTable;

impl Migration for CreateUiStateTable {
    const NAME: &'static str = "create_ui_state_table";

    fn up(schema: &mut Schema) {
        schema.create("ui_state", |table| {
            table.text("key");
            table.primary(&["key"]);
            table.text("value");
        });
    }
}
