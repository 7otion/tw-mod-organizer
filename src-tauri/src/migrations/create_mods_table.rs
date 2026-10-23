use tauri_plugin_7otion_sqlite::migrate::{DateStorage, Migration, Schema};

pub struct CreateModsTable;

impl Migration for CreateModsTable {
    const NAME: &'static str = "create_mods_table";

    fn up(schema: &mut Schema) {
        schema.create("mods", |table| {
            table.id();
            table.integer("game_id").references("games");
            table.text("source");
            table.text("source_ref");
            table.text("game_ref").nullable();
            table.text("title");
            table.text("custom_title").nullable();
            table.text("description").nullable();
            table.text("author_name").nullable();
            table.text("author_ref").nullable();
            table.text("version").nullable();
            table.text("remote_version").nullable();
            table.text("page_url").nullable();
            table.text("preview_url").nullable();
            table.text("preview_file").nullable();
            table.text("custom_preview_file").nullable();
            table.text("folder").nullable();
            table.text("problem").nullable();
            table.integer("size_bytes").nullable();
            table.date("published_at", DateStorage::Unix).nullable();
            table
                .date("remote_updated_at", DateStorage::Unix)
                .nullable();
            table
                .date("installed_updated_at", DateStorage::Unix)
                .nullable();
            table.date("seen_updated_at", DateStorage::Unix).nullable();
            table.integer("nexus_mod_id").nullable();
            table.integer("nexus_file_id").nullable();
            table.date("added_at", DateStorage::Unix).nullable();
            table.date("missing_since", DateStorage::Unix).nullable();
            table.unique(&["game_id", "source", "source_ref"]);
            table.index(&["game_id", "game_ref"]);
        });
    }
}
