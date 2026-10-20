use serde::Serialize;

use crate::archive;
use crate::error::AppError;
use crate::games;

#[derive(Serialize)]
pub struct AcceptedInputs {
    extensions: &'static [&'static str],
    archives: &'static [&'static str],
    folders: bool,
}

#[tauri::command(rename_all = "snake_case")]
pub fn install_inputs(app_id: u32) -> Result<AcceptedInputs, AppError> {
    let inputs = games::find(app_id)?.install_inputs();
    Ok(AcceptedInputs {
        extensions: inputs.extensions,
        archives: &archive::EXTENSIONS,
        folders: inputs.folders,
    })
}
