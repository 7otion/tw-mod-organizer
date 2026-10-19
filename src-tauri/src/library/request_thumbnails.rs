use std::collections::hash_map::DefaultHasher;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::{self, BufWriter, Cursor, Read};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use fast_image_resize::images::Image;
use fast_image_resize::{IntoImageView, Resizer};
use image::codecs::jpeg::JpegEncoder;
use image::{DynamicImage, ExtendedColorType, ImageEncoder, ImageReader};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::error::AppError;

const MAX_SIDE: u32 = 300;
const JPEG_QUALITY: u8 = 80;
const PAUSE_BETWEEN: Duration = Duration::from_millis(40);
const EMIT_EVERY: usize = 20;
const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(15);
const FINGERPRINT_BYTES: usize = 4096;

#[derive(Deserialize)]
pub struct ThumbnailSource {
    mod_id: i64,
    file: Option<PathBuf>,
    url: Option<String>,
}

#[derive(Serialize)]
struct Thumbnail {
    mod_id: i64,
    file: PathBuf,
    width: u32,
    height: u32,
}

struct CachedThumbnail {
    file: PathBuf,
    width: u32,
    height: u32,
}

#[derive(Default)]
pub struct ThumbnailRequests {
    latest: AtomicU64,
}

#[tauri::command(rename_all = "snake_case")]
pub fn request_thumbnails(
    app: AppHandle,
    requests: State<'_, ThumbnailRequests>,
    app_id: u32,
    sources: Vec<ThumbnailSource>,
) -> Result<(), AppError> {
    let folder = app
        .path()
        .app_cache_dir()?
        .join("thumbnails")
        .join(app_id.to_string());
    let request = requests.latest.fetch_add(1, Ordering::SeqCst) + 1;
    thread::spawn(move || {
        if let Err(error) = make_thumbnails(&app, request, &folder, sources) {
            tracing::warn!("thumbnails stopped: {error}");
        }
    });
    Ok(())
}

fn make_thumbnails(
    app: &AppHandle,
    request: u64,
    folder: &Path,
    sources: Vec<ThumbnailSource>,
) -> Result<(), AppError> {
    fs::create_dir_all(folder)?;
    let (cached, mut stale) = cached_thumbnails(folder)?;
    let mut wanted = HashSet::new();
    let mut ready = Vec::new();
    let mut missing = Vec::new();
    for source in sources {
        let Some(key) = thumbnail_key(&source) else {
            continue;
        };
        match cached.get(&key) {
            Some(thumbnail) => ready.push(Thumbnail {
                mod_id: source.mod_id,
                file: thumbnail.file.clone(),
                width: thumbnail.width,
                height: thumbnail.height,
            }),
            None => missing.push((source, key.clone())),
        }
        wanted.insert(key);
    }
    emit(app, &ready);
    for (key, thumbnail) in cached {
        if !wanted.contains(&key) {
            stale.push(thumbnail.file);
        }
    }
    if !stale.is_empty()
        && let Err(error) = trash_stale(folder, &stale)
    {
        tracing::warn!("couldn't move stale thumbnails to the Recycle Bin: {error}");
    }

    let client = reqwest::Client::builder()
        .timeout(DOWNLOAD_TIMEOUT)
        .build()?;

    let mut made = Vec::new();
    for (source, key) in missing {
        if app
            .state::<ThumbnailRequests>()
            .latest
            .load(Ordering::SeqCst)
            != request
        {
            return Ok(());
        }
        match source_bytes(&client, &source).and_then(|bytes| write_thumbnail(&bytes, folder, &key))
        {
            Ok(thumbnail) => made.push(Thumbnail {
                mod_id: source.mod_id,
                file: thumbnail.file,
                width: thumbnail.width,
                height: thumbnail.height,
            }),
            Err(error) => tracing::debug!(mod_id = source.mod_id, "no thumbnail: {error}"),
        }
        if made.len() >= EMIT_EVERY {
            emit(app, &made);
            made.clear();
        }
        thread::sleep(PAUSE_BETWEEN);
    }
    emit(app, &made);
    Ok(())
}

fn cached_thumbnails(
    folder: &Path,
) -> Result<(HashMap<String, CachedThumbnail>, Vec<PathBuf>), AppError> {
    let mut cached = HashMap::new();
    let mut unreadable = Vec::new();
    for entry in fs::read_dir(folder)? {
        let file = entry?.path();
        let name = file
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();
        match parse_thumbnail_name(&name) {
            Some((key, width, height)) => {
                cached.insert(
                    key,
                    CachedThumbnail {
                        file,
                        width,
                        height,
                    },
                );
            }
            None => unreadable.push(file),
        }
    }
    Ok((cached, unreadable))
}

fn parse_thumbnail_name(name: &str) -> Option<(String, u32, u32)> {
    let (key, size) = name.strip_suffix(".jpg")?.rsplit_once('-')?;
    let (width, height) = size.split_once('x')?;
    Some((key.to_owned(), width.parse().ok()?, height.parse().ok()?))
}

fn thumbnail_key(source: &ThumbnailSource) -> Option<String> {
    let mut hasher = DefaultHasher::new();
    let fingerprint = source
        .file
        .as_ref()
        .and_then(|file| file_fingerprint(file).ok());
    match (&source.file, fingerprint, &source.url) {
        (Some(file), Some((len, head)), _) => {
            file.hash(&mut hasher);
            len.hash(&mut hasher);
            head.hash(&mut hasher);
        }
        (_, _, Some(url)) => url.hash(&mut hasher),
        _ => return None,
    }
    Some(format!("{:016x}", hasher.finish()))
}

fn file_fingerprint(file: &Path) -> io::Result<(u64, Vec<u8>)> {
    let mut reader = fs::File::open(file)?;
    let len = reader.metadata()?.len();
    let mut head = Vec::with_capacity(FINGERPRINT_BYTES);
    (&mut reader)
        .take(FINGERPRINT_BYTES as u64)
        .read_to_end(&mut head)?;
    Ok((len, head))
}

fn trash_stale(folder: &Path, stale: &[PathBuf]) -> Result<(), AppError> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis())
        .unwrap_or_default();
    let bin = folder.join(format!("stale-{millis}"));
    fs::create_dir_all(&bin)?;
    for file in stale {
        if let Some(name) = file.file_name() {
            fs::rename(file, bin.join(name))?;
        }
    }
    trash::delete(&bin)?;
    Ok(())
}

fn source_bytes(client: &reqwest::Client, source: &ThumbnailSource) -> Result<Vec<u8>, AppError> {
    if let Some(file) = source.file.as_ref().filter(|file| file.is_file()) {
        return Ok(fs::read(file)?);
    }
    let url = source
        .url
        .as_ref()
        .ok_or_else(|| AppError::Custom("no cover source".to_owned()))?;
    tauri::async_runtime::block_on(async {
        let response = client.get(url).send().await?.error_for_status()?;
        Ok(response.bytes().await?.to_vec())
    })
}

fn write_thumbnail(bytes: &[u8], folder: &Path, key: &str) -> Result<CachedThumbnail, AppError> {
    let decoded = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()?
        .decode()?;
    let image = DynamicImage::ImageRgb8(decoded.to_rgb8());
    let scale = (f64::from(MAX_SIDE) / f64::from(image.width().max(image.height()))).min(1.0);
    let width = ((f64::from(image.width()) * scale).round() as u32).max(1);
    let height = ((f64::from(image.height()) * scale).round() as u32).max(1);
    let pixel_type = image
        .pixel_type()
        .ok_or_else(|| AppError::Custom("unsupported pixel type".to_owned()))?;
    let mut thumbnail = Image::new(width, height, pixel_type);
    Resizer::new()
        .resize(&image, &mut thumbnail, None)
        .map_err(|error| AppError::Custom(error.to_string()))?;

    let partial = folder.join(format!("{key}.part"));
    JpegEncoder::new_with_quality(BufWriter::new(fs::File::create(&partial)?), JPEG_QUALITY)
        .write_image(thumbnail.buffer(), width, height, ExtendedColorType::Rgb8)?;
    let file = folder.join(format!("{key}-{width}x{height}.jpg"));
    fs::rename(&partial, &file)?;
    Ok(CachedThumbnail {
        file,
        width,
        height,
    })
}

fn emit(app: &AppHandle, thumbnails: &[Thumbnail]) {
    if thumbnails.is_empty() {
        return;
    }
    if let Err(error) = app.emit("library-thumbnails", thumbnails) {
        tracing::debug!("couldn't report thumbnails: {error}");
    }
}
