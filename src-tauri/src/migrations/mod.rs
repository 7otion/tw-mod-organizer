use tauri_plugin_7otion_sqlite::migrate::Migrations;
use tauri_plugin_7otion_sqlite::migrations;

mod create_downloads_table;
mod create_games_table;
mod create_group_members_table;
mod create_groups_table;
mod create_launch_entries_table;
mod create_launches_table;
mod create_mod_dependencies_table;
mod create_mod_tags_table;
mod create_mods_table;
mod create_profile_entries_table;
mod create_profile_group_disabled_table;
mod create_profiles_table;
mod create_saves_table;
mod create_separators_table;
mod create_settings_table;
mod create_tags_table;
mod create_ui_columns_table;
mod create_ui_state_table;

use create_downloads_table::CreateDownloadsTable;
use create_games_table::CreateGamesTable;
use create_group_members_table::CreateGroupMembersTable;
use create_groups_table::CreateGroupsTable;
use create_launch_entries_table::CreateLaunchEntriesTable;
use create_launches_table::CreateLaunchesTable;
use create_mod_dependencies_table::CreateModDependenciesTable;
use create_mod_tags_table::CreateModTagsTable;
use create_mods_table::CreateModsTable;
use create_profile_entries_table::CreateProfileEntriesTable;
use create_profile_group_disabled_table::CreateProfileGroupDisabledTable;
use create_profiles_table::CreateProfilesTable;
use create_saves_table::CreateSavesTable;
use create_separators_table::CreateSeparatorsTable;
use create_settings_table::CreateSettingsTable;
use create_tags_table::CreateTagsTable;
use create_ui_columns_table::CreateUiColumnsTable;
use create_ui_state_table::CreateUiStateTable;

pub fn app() -> Migrations {
    migrations![
        CreateGamesTable,
        CreateSettingsTable,
        CreateModsTable,
        CreateTagsTable,
        CreateModTagsTable,
        CreateModDependenciesTable,
        CreateProfilesTable,
        CreateGroupsTable,
        CreateSeparatorsTable,
        CreateProfileEntriesTable,
        CreateGroupMembersTable,
        CreateProfileGroupDisabledTable,
        CreateLaunchesTable,
        CreateLaunchEntriesTable,
        CreateSavesTable,
        CreateDownloadsTable,
        CreateUiStateTable,
        CreateUiColumnsTable,
    ]
}
