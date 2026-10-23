use serde::Serialize;

use crate::error::AppError;

const SCHEME: &str = "nxm://";

#[derive(Serialize)]
pub struct NxmLink {
    pub domain: String,
    pub mod_id: u32,
    pub file_id: u32,
    pub key: Option<String>,
    pub expires: Option<i64>,
}

impl NxmLink {
    pub fn parse(link: &str) -> Result<Self, AppError> {
        let rest = link.strip_prefix(SCHEME).ok_or_else(|| Self::bad(link))?;
        let (path, query) = match rest.split_once('?') {
            Some((path, query)) => (path, Some(query)),
            None => (rest, None),
        };
        let segments: Vec<&str> = path.trim_end_matches('/').split('/').collect();
        let [domain, "mods", mod_id, "files", file_id] = segments[..] else {
            return Err(Self::bad(link));
        };
        let mut key = None;
        let mut expires = None;
        for pair in query.unwrap_or_default().split('&') {
            let Some((name, value)) = pair.split_once('=') else {
                continue;
            };
            match name {
                "key" => key = Some(value.to_owned()),
                "expires" => expires = value.parse().ok(),
                _ => {}
            }
        }
        Ok(Self {
            domain: domain.to_owned(),
            mod_id: mod_id.parse().map_err(|_| Self::bad(link))?,
            file_id: file_id.parse().map_err(|_| Self::bad(link))?,
            key,
            expires,
        })
    }

    fn bad(link: &str) -> AppError {
        AppError::Custom(format!("Not a Nexus download link: {link}"))
    }
}
