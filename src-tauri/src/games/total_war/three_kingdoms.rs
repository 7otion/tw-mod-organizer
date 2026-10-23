use super::TotalWar;
use crate::games::GameInfo;

pub const THREE_KINGDOMS: TotalWar = TotalWar {
    info: GameInfo {
        app_id: 779340,
        series: "Total War",
        title: "Three Kingdoms",
        cover: "/tw3k.jpg",
        nexus_domain: "totalwarthreekingdoms",
    },
    mods_folder_name: "threekingdoms",
    #[cfg(windows)]
    exe: "Three_Kingdoms.exe",
};
