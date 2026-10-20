use std::fs::File;
use std::path::Path;

use zip::ZipArchive;

use super::{Archive, Entry, Progress, copy_with_progress, normalise, not_found};
use crate::error::AppError;

pub struct Zip {
    archive: ZipArchive<File>,
}

impl Zip {
    pub fn open(path: &Path) -> Result<Self, AppError> {
        Ok(Self {
            archive: ZipArchive::new(File::open(path)?)?,
        })
    }
}

impl Archive for Zip {
    fn entries(&mut self) -> Result<Vec<Entry>, AppError> {
        let mut entries = Vec::new();
        for index in 0..self.archive.len() {
            let file = self.archive.by_index(index)?;
            if file.is_file() {
                entries.push(Entry {
                    path: normalise(&file.name()?),
                    size: file.size(),
                });
            }
        }
        Ok(entries)
    }

    fn extract(&mut self, entry: &str, to: &Path, progress: Progress) -> Result<(), AppError> {
        for index in 0..self.archive.len() {
            let mut file = self.archive.by_index(index)?;
            if file.is_file() && normalise(&file.name()?) == entry {
                return copy_with_progress(&mut file, to, progress);
            }
        }
        Err(not_found(entry))
    }
}
