use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter};

use crate::error::AppError;

pub mod force_quit_game;
pub mod launch_game;
pub mod watch_game;

pub const EXITED_EVENT: &str = "game-exited";

const POLL: Duration = Duration::from_secs(2);
const START_GRACE: Duration = Duration::from_secs(90);

static WATCHED: Mutex<Vec<u32>> = Mutex::new(Vec::new());

pub struct Watcher {
    app: AppHandle,
    app_id: u32,
    process_name: &'static str,
}

impl Watcher {
    pub fn start(app: AppHandle, app_id: u32, process_name: &'static str, expects_start: bool) {
        {
            let mut watched = WATCHED.lock().unwrap();
            if watched.contains(&app_id) {
                return;
            }
            watched.push(app_id);
        }
        let watcher = Self {
            app,
            app_id,
            process_name,
        };
        thread::spawn(move || watcher.run(expects_start));
    }

    fn run(self, expects_start: bool) {
        let started = Instant::now();
        let mut seen = !expects_start;
        loop {
            thread::sleep(POLL);
            let running = is_running(self.process_name).unwrap_or(false);
            if running {
                seen = true;
                continue;
            }
            if seen || started.elapsed() > START_GRACE {
                break;
            }
        }
        WATCHED.lock().unwrap().retain(|id| *id != self.app_id);
        if let Err(error) = self.app.emit(EXITED_EVENT, self.app_id) {
            tracing::warn!("couldn't report the game exit: {error}");
        }
    }
}

#[cfg(windows)]
pub fn is_running(process_name: &str) -> Result<bool, AppError> {
    let output = crate::process::windowless_command("tasklist")
        .args(["/FI", &format!("IMAGENAME eq {process_name}"), "/NH"])
        .output()?;
    let listed = String::from_utf8_lossy(&output.stdout).to_lowercase();
    Ok(listed.contains(&process_name.to_lowercase()))
}

#[cfg(not(windows))]
pub fn is_running(_process_name: &str) -> Result<bool, AppError> {
    unimplemented!("checking a running game on this platform")
}

#[cfg(windows)]
pub fn kill(process_name: &str) -> Result<(), AppError> {
    let output = crate::process::windowless_command("taskkill")
        .args(["/F", "/IM", process_name])
        .output()?;
    if output.status.success() {
        return Ok(());
    }
    Err(AppError::Custom(format!(
        "Couldn't force quit {process_name}: {}",
        String::from_utf8_lossy(&output.stderr).trim()
    )))
}

#[cfg(not(windows))]
pub fn kill(_process_name: &str) -> Result<(), AppError> {
    unimplemented!("force quitting a game on this platform")
}
