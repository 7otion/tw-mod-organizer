use std::fs;
use std::path::{Path, PathBuf};

use super::{GameInfo, GameSupport, ModInfo};
use crate::error::AppError;

mod three_kingdoms;
mod warhammer_2;
mod warhammer_3;

pub use three_kingdoms::THREE_KINGDOMS;
pub use warhammer_2::WARHAMMER_2;
pub use warhammer_3::WARHAMMER_3;

const IMAGE_EXTENSIONS: [&str; 3] = ["png", "jpg", "jpeg"];
const IGNORED_STEAM_TAGS: [&str; 1] = ["mod"];

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
            0 => Some("no .pack file"),
            1 => None,
            _ => Some("more than one .pack file"),
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
