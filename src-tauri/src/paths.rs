use std::path::Path;

pub fn file_name_of(path: &str) -> &str {
    path.rsplit(['/', '\\']).next().unwrap_or(path)
}

pub fn stem_of(file_name: &str) -> &str {
    file_name
        .rfind('.')
        .filter(|dot| *dot > 0)
        .map_or(file_name, |dot| &file_name[..dot])
}

pub fn extension_of(path: impl AsRef<Path>) -> Option<String> {
    path.as_ref()
        .extension()
        .map(|extension| extension.to_string_lossy().to_ascii_lowercase())
}
