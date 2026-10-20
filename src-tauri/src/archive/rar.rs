use std::path::{Path, PathBuf};

use super::{Archive, Entry, Progress, normalise, not_found};
use crate::error::AppError;

pub struct Rar {
    path: PathBuf,
}

impl Rar {
    pub fn open(path: &Path) -> Self {
        Self {
            path: path.to_path_buf(),
        }
    }
}

impl Archive for Rar {
    fn entries(&mut self) -> Result<Vec<Entry>, AppError> {
        let mut entries = Vec::new();
        let mut archive = unrar::Archive::new(&self.path).open_for_listing()?;
        while let Some(header) = archive.read_header()? {
            let file = header.entry();
            if file.is_file() {
                entries.push(Entry {
                    path: normalise(&file.filename.to_string_lossy()),
                    size: file.unpacked_size,
                });
            }
            archive = header.skip()?;
        }
        Ok(entries)
    }

    fn extract(&mut self, entry: &str, to: &Path, progress: Progress) -> Result<(), AppError> {
        let mut archive = unrar::Archive::new(&self.path).open_for_processing()?;
        while let Some(header) = archive.read_header()? {
            let file = header.entry();
            if file.is_file() && normalise(&file.filename.to_string_lossy()) == entry {
                let size = file.unpacked_size;
                header.extract_to(to)?;
                progress(size)?;
                return Ok(());
            }
            archive = header.skip()?;
        }
        Err(not_found(entry))
    }
}
