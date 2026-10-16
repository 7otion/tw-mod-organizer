use tauri_plugin_7otion_sqlite::migrate::{DateStorage, Migration, Schema};

pub struct CreateDownloadsTable;

impl Migration for CreateDownloadsTable {
    const NAME: &'static str = "create_downloads_table";

    fn up(schema: &mut Schema) {
        schema.create("downloads", |table| {
            table.id();
            table.integer("game_id").references("games");
            table.integer("nexus_mod_id");
            table.integer("nexus_file_id");
            table.text("file_name");
            table.text("title");
            table.text("position");
            table.text("version").nullable();
            table.text("author_name").nullable();
            table.text("page_url").nullable();
            table.text("preview_url").nullable();
            table.integer("total_bytes").nullable();
            table.integer("received_bytes").default(0);
            table.text("status").default("queued");
            table.text("error").nullable();
            table.text("nxm_key").nullable();
            table.date("nxm_expires_at", DateStorage::Unix).nullable();
            table.text("archive_path").nullable();
            table.integer("mod_id").nullable().references("mods");
            table.boolean("hidden").default(false);
            table.date("created_at", DateStorage::Unix).default_now();
            table.date("updated_at", DateStorage::Unix).default_now();
            table.date("completed_at", DateStorage::Unix).nullable();
            table.unique(&["game_id", "nexus_file_id"]);
            table.unique(&["game_id", "position"]);
        });
    }
}
