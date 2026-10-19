use super::TotalWar;
use crate::games::GameInfo;

pub const WARHAMMER_2: TotalWar = TotalWar {
    info: GameInfo {
        app_id: 594570,
        series: "Total War",
        title: "Warhammer II",
        cover: "/tww2.jpg",
    },
    mods_folder_name: "warhammer2",
    #[cfg(windows)]
    exe: "Warhammer2.exe",
};
