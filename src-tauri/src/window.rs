use std::fs;

use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow};

use crate::window_position::{default_position, sanitize_position, WindowPosition};

const POSITION_FILE: &str = "window-position.json";

fn position_file(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("failed to resolve app config dir: {error}"))?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("failed to create app config dir: {error}"))?;
    Ok(dir.join(POSITION_FILE))
}

#[tauri::command]
pub fn load_window_position(app: AppHandle) -> Result<WindowPosition, String> {
    let file = position_file(&app)?;
    if !file.exists() {
        return Ok(default_position());
    }

    let content = fs::read_to_string(&file)
        .map_err(|error| format!("failed to read position file: {error}"))?;
    let position: WindowPosition = serde_json::from_str(&content)
        .map_err(|error| format!("invalid position file: {error}"))?;
    Ok(sanitize_position(position))
}

#[tauri::command]
pub fn save_window_position(app: AppHandle, position: WindowPosition) -> Result<(), String> {
    let file = position_file(&app)?;
    let content = serde_json::to_string_pretty(&sanitize_position(position))
        .map_err(|error| format!("failed to serialize position: {error}"))?;
    fs::write(file, content).map_err(|error| format!("failed to write position file: {error}"))
}

#[tauri::command]
pub fn start_drag(window: WebviewWindow) -> Result<(), String> {
    window
        .start_dragging()
        .map_err(|error| format!("failed to start dragging: {error}"))
}

pub fn apply_saved_position(app: &AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    let position = load_window_position(app.clone())?;
    window
        .set_position(PhysicalPosition::new(position.x, position.y))
        .map_err(|error| format!("failed to apply window position: {error}"))
}
