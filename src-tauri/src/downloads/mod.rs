use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use reqwest::StatusCode;
use reqwest::header::RANGE;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::error::AppError;

pub mod discard_download_file;
pub mod pause_download;
pub mod start_download;

pub const PROGRESS_EVENT: &str = "download-progress";
pub const DONE_EVENT: &str = "download-done";
pub const FAILED_EVENT: &str = "download-failed";
pub const PAUSED_EVENT: &str = "download-paused";

const PART_SUFFIX: &str = ".part";
const REPORT_EVERY: Duration = Duration::from_millis(250);

static ACTIVE: Mutex<Option<Active>> = Mutex::new(None);

struct Active {
    id: i64,
    stop: Arc<AtomicBool>,
}

#[derive(Clone, Serialize)]
pub struct Progress {
    id: i64,
    received: u64,
    total: Option<u64>,
}

#[derive(Clone, Serialize)]
pub struct Done {
    id: i64,
    path: PathBuf,
    received: u64,
}

#[derive(Clone, Serialize)]
pub struct Failed {
    id: i64,
    error: String,
}

#[derive(Clone, Serialize)]
pub struct Paused {
    id: i64,
    received: u64,
}

enum Outcome {
    Done { received: u64 },
    Paused { received: u64 },
}

pub struct Transfer {
    app: AppHandle,
    id: i64,
    url: String,
    target: PathBuf,
    resume: bool,
    stop: Arc<AtomicBool>,
}

impl Transfer {
    pub fn begin(
        app: AppHandle,
        id: i64,
        url: String,
        target: PathBuf,
        resume: bool,
    ) -> Result<(), AppError> {
        let stop = Arc::new(AtomicBool::new(false));
        {
            let mut active = ACTIVE.lock().unwrap();
            if active.is_some() {
                return Err(AppError::Custom(
                    "Another download is still running.".to_owned(),
                ));
            }
            *active = Some(Active {
                id,
                stop: stop.clone(),
            });
        }
        let transfer = Self {
            app,
            id,
            url,
            target,
            resume,
            stop,
        };
        tauri::async_runtime::spawn(async move { transfer.finish().await });
        Ok(())
    }

    pub fn pause(id: i64) -> bool {
        let active = ACTIVE.lock().unwrap();
        match active.as_ref() {
            Some(active) if active.id == id => {
                active.stop.store(true, Ordering::SeqCst);
                true
            }
            _ => false,
        }
    }

    pub fn part_path(target: &Path) -> PathBuf {
        let mut name = target.file_name().unwrap_or_default().to_os_string();
        name.push(PART_SUFFIX);
        target.with_file_name(name)
    }

    async fn finish(self) {
        let outcome = self.run().await;
        *ACTIVE.lock().unwrap() = None;
        let result = match outcome {
            Ok(Outcome::Done { received }) => self.app.emit(
                DONE_EVENT,
                Done {
                    id: self.id,
                    path: self.target.clone(),
                    received,
                },
            ),
            Ok(Outcome::Paused { received }) => self.app.emit(
                PAUSED_EVENT,
                Paused {
                    id: self.id,
                    received,
                },
            ),
            Err(error) => self.app.emit(
                FAILED_EVENT,
                Failed {
                    id: self.id,
                    error: error.to_string(),
                },
            ),
        };
        if let Err(error) = result {
            tracing::warn!("couldn't report the download outcome: {error}");
        }
    }

    async fn run(&self) -> Result<Outcome, AppError> {
        if let Some(folder) = self.target.parent() {
            fs::create_dir_all(folder)?;
        }
        let part = Self::part_path(&self.target);
        let mut received = if self.resume {
            fs::metadata(&part).map(|meta| meta.len()).unwrap_or(0)
        } else {
            0
        };
        let client = reqwest::Client::builder()
            .user_agent(concat!("TWModOrganizer/", env!("CARGO_PKG_VERSION")))
            .build()?;
        let mut request = client.get(&self.url);
        if received > 0 {
            request = request.header(RANGE, format!("bytes={received}-"));
        }
        let mut response = request.send().await?;
        let status = response.status();
        if received > 0 && status != StatusCode::PARTIAL_CONTENT {
            received = 0;
        }
        if !status.is_success() {
            return Err(AppError::Custom(format!(
                "The download server answered {status}."
            )));
        }
        let total = response.content_length().map(|length| length + received);
        let mut file = OpenOptions::new()
            .create(true)
            .write(true)
            .append(received > 0)
            .truncate(received == 0)
            .open(&part)?;
        let mut reported = Instant::now();
        loop {
            if self.stop.load(Ordering::SeqCst) {
                file.flush()?;
                return Ok(Outcome::Paused { received });
            }
            let Some(chunk) = response.chunk().await? else {
                break;
            };
            file.write_all(&chunk)?;
            received += chunk.len() as u64;
            if reported.elapsed() >= REPORT_EVERY {
                reported = Instant::now();
                let _ = self.app.emit(
                    PROGRESS_EVENT,
                    Progress {
                        id: self.id,
                        received,
                        total,
                    },
                );
            }
        }
        file.flush()?;
        drop(file);
        if let Some(total) = total
            && received < total
        {
            return Err(AppError::Custom(
                "The download ended before the file was complete.".to_owned(),
            ));
        }
        if self.target.exists() {
            trash::delete(&self.target)?;
        }
        fs::rename(&part, &self.target)?;
        Ok(Outcome::Done { received })
    }
}
