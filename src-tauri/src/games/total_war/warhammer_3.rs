use super::TotalWar;
use crate::games::GameInfo;

pub const WARHAMMER_3: TotalWar = TotalWar {
    info: GameInfo {
        app_id: 1142710,
        series: "Total War",
        title: "Warhammer III",
        cover: "/tww3.jpg",
    },
    mods_folder_name: "warhammer3",
    #[cfg(windows)]
    exe: "Warhammer3.exe",
};
