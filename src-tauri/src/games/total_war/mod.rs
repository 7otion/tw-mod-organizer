use std::fs;
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
#[cfg(windows)]
use std::process::Command;

use super::{
    Candidate, Fact, GameInfo, GameSupport, InstallInputs, Installable, LaunchMod, ModInfo,
    Selection, SourceEntry,
};
use crate::error::AppError;
use crate::paths::{extension_of, file_name_of, stem_of};

mod three_kingdoms;
mod warhammer_2;
mod warhammer_3;

pub use three_kingdoms::THREE_KINGDOMS;
pub use warhammer_2::WARHAMMER_2;
pub use warhammer_3::WARHAMMER_3;

const IMAGE_EXTENSIONS: [&str; 3] = ["png", "jpg", "jpeg"];
const IGNORED_STEAM_TAGS: [&str; 1] = ["mod"];
const PACK_EXTENSION: &str = "pack";
const INSTALL_INPUTS: InstallInputs = InstallInputs {
    extensions: &[PACK_EXTENSION],
    folders: false,
};
const PATCH_SUFFIX: &str = "_patch";
const LAUNCH_LIST: &str = "tw_mod_organizer_used_mods.txt";
#[cfg(windows)]
const CREATE_BREAKAWAY_FROM_JOB: u32 = 0x0100_0000;

pub struct TotalWar {
    info: GameInfo,
    mods_folder_name: &'static str,
    #[cfg(windows)]
    exe: &'static str,
}

struct FolderContents {
    folder_name: String,
    pack_files: Vec<PathBuf>,
    image_files: Vec<PathBuf>,
    size_bytes: u64,
}

impl GameSupport for TotalWar {
    fn info(&self) -> GameInfo {
        self.info
    }

    fn mods_folder_name(&self) -> &'static str {
        self.mods_folder_name
    }

    fn install_inputs(&self) -> InstallInputs {
        INSTALL_INPUTS
    }

    fn find_installable(&self, entries: &[SourceEntry]) -> Installable {
        let mut packs: Vec<&SourceEntry> = entries
            .iter()
            .filter(|entry| extension_of(&entry.path) == Some(PACK_EXTENSION.to_owned()))
            .collect();
        packs.sort_by(|a, b| b.size.cmp(&a.size));
        let candidates = packs
            .iter()
            .enumerate()
            .map(|(index, pack)| {
                let file_name = file_name_of(&pack.path);
                let stem = stem_of(file_name);
                let role = if stem.to_ascii_lowercase().ends_with(PATCH_SUFFIX) {
                    "patch"
                } else if index == 0 {
                    "main"
                } else {
                    "alternative"
                };
                let mut candidate_entries = vec![pack.path.clone()];
                if let Some(image) = companion_image(entries, stem) {
                    candidate_entries.push(image.path.clone());
                }
                Candidate {
                    id: pack.path.clone(),
                    name: stem.to_owned(),
                    identity: Fact {
                        label: "identifiedBy",
                        value: file_name.to_owned(),
                    },
                    facts: vec![Fact {
                        label: "role",
                        value: role.to_owned(),
                    }],
                    size_bytes: pack.size,
                    entries: candidate_entries,
                    problem: None,
                }
            })
            .collect();
        Installable {
            candidates,
            selection: Selection::Single,
            identities_can_coexist: false,
        }
    }

    fn nothing_installable_reason(&self) -> &'static str {
        "Mods for this game are .pack files, and there is none inside."
    }

    #[cfg(windows)]
    fn holds_game(&self, path: &Path) -> bool {
        path.join(self.exe).is_file()
    }

    #[cfg(not(windows))]
    fn holds_game(&self, _path: &Path) -> bool {
        unimplemented!("checking a game folder on this platform")
    }

    fn mod_info(&self, folder: &Path) -> Result<ModInfo, AppError> {
        Ok(FolderContents::read(folder)?.into_mod_info())
    }

    fn local_source_ref(&self, folder_name: &str) -> String {
        format!("{folder_name}.pack")
    }

    fn ignored_steam_tags(&self) -> &'static [&'static str] {
        &IGNORED_STEAM_TAGS
    }

    #[cfg(windows)]
    fn process_name(&self) -> &'static str {
        self.exe
    }

    #[cfg(not(windows))]
    fn process_name(&self) -> &'static str {
        unimplemented!("naming the game process on this platform")
    }

    #[cfg(windows)]
    fn launch(
        &self,
        install_path: &Path,
        mods: &[LaunchMod],
        save: Option<&str>,
    ) -> Result<(), AppError> {
        fs::write(install_path.join(LAUNCH_LIST), TotalWar::launch_list(mods))?;
        let mut command = Command::new(install_path.join(self.exe));
        command
            .current_dir(install_path)
            .raw_arg(format!("{LAUNCH_LIST};"));
        if let Some(save) = save {
            command.raw_arg(format!("game_startup_mode campaign_load \"{save}\";"));
        }
        command.creation_flags(CREATE_BREAKAWAY_FROM_JOB);
        if command.spawn().is_ok() {
            return Ok(());
        }
        command.creation_flags(0);
        command.spawn()?;
        Ok(())
    }

    #[cfg(not(windows))]
    fn launch(
        &self,
        _install_path: &Path,
        _mods: &[LaunchMod],
        _save: Option<&str>,
    ) -> Result<(), AppError> {
        unimplemented!("launching the game on this platform")
    }
}

impl TotalWar {
    fn launch_list(mods: &[LaunchMod]) -> String {
        let mut folders: Vec<String> = Vec::new();
        for item in mods {
            let folder = item.folder.to_string_lossy().replace('\\', "/");
            if !folders.contains(&folder) {
                folders.push(folder);
            }
        }
        let mut list = String::new();
        for folder in folders {
            list.push_str(&format!("add_working_directory \"{folder}\";\n"));
        }
        for item in mods {
            list.push_str(&format!("mod \"{}\";\n", item.game_ref));
        }
        list
    }
}

fn companion_image<'a>(entries: &'a [SourceEntry], stem: &str) -> Option<&'a SourceEntry> {
    entries.iter().find(|entry| {
        let name = file_name_of(&entry.path);
        stem_of(name) == stem
            && extension_of(name)
                .is_some_and(|extension| IMAGE_EXTENSIONS.contains(&extension.as_str()))
    })
}

impl FolderContents {
    fn read(folder: &Path) -> Result<Self, AppError> {
        let mut contents = Self {
            folder_name: folder
                .file_name()
                .map(|name| name.to_string_lossy().into_owned())
                .unwrap_or_default(),
            pack_files: Vec::new(),
            image_files: Vec::new(),
            size_bytes: 0,
        };
        for entry in fs::read_dir(folder)? {
            let entry = entry?;
            let metadata = entry.metadata()?;
            if metadata.is_file() {
                contents.size_bytes += metadata.len();
                contents.record_file(entry.path());
            }
        }
        Ok(contents)
    }

    fn record_file(&mut self, file: PathBuf) {
        let Some(extension) = file.extension() else {
            return;
        };
        let extension = extension.to_string_lossy().to_ascii_lowercase();
        if extension == "pack" {
            self.pack_files.push(file);
        } else if IMAGE_EXTENSIONS.contains(&extension.as_str()) {
            self.image_files.push(file);
        }
    }

    fn into_mod_info(self) -> ModInfo {
        let pack = match self.pack_files.as_slice() {
            [pack] => Some(pack),
            _ => None,
        };
        let problem = match self.pack_files.len() {
            0 => Some("no_pack_file"),
            1 => None,
            _ => Some("many_pack_files"),
        };
        ModInfo {
            game_ref: pack
                .and_then(|pack| pack.file_name())
                .map(|name| name.to_string_lossy().into_owned()),
            title: pack
                .and_then(|pack| pack.file_stem())
                .map(|stem| stem.to_string_lossy().into_owned())
                .unwrap_or_else(|| self.folder_name.clone()),
            preview_file: self.pick_preview(pack),
            size_bytes: self.size_bytes,
            problem,
        }
    }

    fn pick_preview(&self, pack: Option<&PathBuf>) -> Option<PathBuf> {
        let stem = pack.and_then(|pack| pack.file_stem());
        for image in &self.image_files {
            if image.file_stem() == stem {
                return Some(image.clone());
            }
        }
        self.image_files.first().cloned()
    }
}
