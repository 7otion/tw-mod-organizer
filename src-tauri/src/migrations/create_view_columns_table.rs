use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateViewColumnsTable;

impl Migration for CreateViewColumnsTable {
    const NAME: &'static str = "create_view_columns_table";

    fn up(schema: &mut Schema) {
        schema.create("view_columns", |table| {
            table.text("view");
            table.text("column_key");
            table.primary(&["view", "column_key"]);
            table.boolean("visible").default(true);
            table.text("position");
            table.integer("width").nullable();
            table.unique(&["view", "position"]);
        });
    }
}
