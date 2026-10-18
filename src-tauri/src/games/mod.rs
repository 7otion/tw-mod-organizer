use serde::Serialize;

use crate::error::AppError;

pub mod check_game_folder;
pub mod list_games;

#[derive(Clone, Copy, Serialize)]
pub struct Game {
    pub app_id: u32,
    pub series: &'static str,
    pub title: &'static str,
    pub cover: &'static str,
    #[cfg(windows)]
    #[serde(skip)]
    pub exe: &'static str,
}

pub const GAMES: [Game; 4] = [
    Game {
        app_id: 1142710,
        series: "Total War",
        title: "Warhammer III",
        cover: "/tww3.jpg",
        #[cfg(windows)]
        exe: "Warhammer3.exe",
    },
    Game {
        app_id: 594570,
        series: "Total War",
        title: "Warhammer II",
        cover: "/tww2.jpg",
        #[cfg(windows)]
        exe: "Warhammer2.exe",
    },
    Game {
        app_id: 779340,
        series: "Total War",
        title: "Three Kingdoms",
        cover: "/tw3k.jpg",
        #[cfg(windows)]
        exe: "Three_Kingdoms.exe",
    },
    Game {
        app_id: 261550,
        series: "Mount & Blade II",
        title: "Bannerlord",
        cover: "/mbbl.jpg",
        #[cfg(windows)]
        exe: r"bin\Win64_Shipping_Client\Bannerlord.exe",
    },
];

fn find(app_id: u32) -> Result<&'static Game, AppError> {
    GAMES
        .iter()
        .find(|game| game.app_id == app_id)
        .ok_or_else(|| AppError::Custom(format!("App {app_id} isn't a supported game.")))
}
