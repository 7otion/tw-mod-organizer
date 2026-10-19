use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateUiColumnsTable;

impl Migration for CreateUiColumnsTable {
    const NAME: &'static str = "create_ui_columns_table";

    fn up(schema: &mut Schema) {
        schema.create("ui_columns", |table| {
            table.text("table_key");
            table.text("column_key");
            table.primary(&["table_key", "column_key"]);
            table.boolean("visible").default(true);
            table.text("position");
            table.integer("width").nullable();
            table.unique(&["table_key", "position"]);
        });
    }
}
