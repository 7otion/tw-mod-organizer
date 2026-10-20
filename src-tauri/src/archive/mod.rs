use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;

use crate::error::AppError;
use crate::paths::extension_of;

mod rar;
mod seven_zip;
mod zip;

pub const EXTENSIONS: [&str; 3] = ["zip", "7z", "rar"];
const BUFFER_SIZE: usize = 1 << 20;

pub struct Entry {
    pub path: String,
    pub size: u64,
}

pub type Progress<'a> = &'a mut dyn FnMut(u64) -> Result<(), AppError>;

pub trait Archive {
    fn entries(&mut self) -> Result<Vec<Entry>, AppError>;

    fn extract(&mut self, entry: &str, to: &Path, progress: Progress) -> Result<(), AppError>;
}

pub fn open(path: &Path) -> Result<Box<dyn Archive>, AppError> {
    match extension_of(path).as_deref() {
        Some("zip") => Ok(Box::new(zip::Zip::open(path)?)),
        Some("7z") => Ok(Box::new(seven_zip::SevenZip::open(path)?)),
        Some("rar") => Ok(Box::new(rar::Rar::open(path))),
        _ => Err(AppError::Custom(format!(
            "{} is not a supported archive",
            path.display()
        ))),
    }
}

pub fn is_archive(path: &Path) -> bool {
    extension_of(path).is_some_and(|extension| EXTENSIONS.contains(&extension.as_str()))
}

pub fn copy_with_progress(
    reader: &mut dyn Read,
    to: &Path,
    progress: Progress,
) -> Result<(), AppError> {
    let mut file = File::create(to)?;
    let mut buffer = vec![0u8; BUFFER_SIZE];
    let mut written = 0u64;
    loop {
        let read = reader.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        file.write_all(&buffer[..read])?;
        written += read as u64;
        progress(written)?;
    }
    file.flush()?;
    Ok(())
}

fn normalise(path: &str) -> String {
    path.replace('\\', "/")
}

fn not_found(entry: &str) -> AppError {
    AppError::Custom(format!("{entry} is not in the archive"))
}
