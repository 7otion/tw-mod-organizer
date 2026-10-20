use std::fs::File;
use std::io;
use std::path::Path;

use sevenz_rust2::{ArchiveReader, Password};

use super::{Archive, Entry, Progress, copy_with_progress, normalise, not_found};
use crate::error::AppError;

pub struct SevenZip {
    reader: ArchiveReader<File>,
}

impl SevenZip {
    pub fn open(path: &Path) -> Result<Self, AppError> {
        Ok(Self {
            reader: ArchiveReader::open(path, Password::empty())?,
        })
    }
}

impl Archive for SevenZip {
    fn entries(&mut self) -> Result<Vec<Entry>, AppError> {
        Ok(self
            .reader
            .archive()
            .files
            .iter()
            .filter(|file| !file.is_directory())
            .map(|file| Entry {
                path: normalise(file.name()),
                size: file.size(),
            })
            .collect())
    }

    fn extract(&mut self, entry: &str, to: &Path, progress: Progress) -> Result<(), AppError> {
        let mut outcome = None;
        self.reader.for_each_entries(|file, reader| {
            if file.is_directory() || normalise(file.name()) != entry {
                io::copy(reader, &mut io::sink())?;
                return Ok(true);
            }
            outcome = Some(copy_with_progress(reader, to, progress));
            Ok(false)
        })?;
        outcome.unwrap_or_else(|| Err(not_found(entry)))
    }
}
