use tauri_plugin_7otion_sqlite::migrate::{Migration, Schema};

pub struct CreateSeparatorsTable;

impl Migration for CreateSeparatorsTable {
    const NAME: &'static str = "create_separators_table";

    fn up(schema: &mut Schema) {
        schema.create("separators", |table| {
            table.id();
            table.text("title");
            table.text("background_color").nullable();
            table.text("text_color").nullable();
        });
    }
}
