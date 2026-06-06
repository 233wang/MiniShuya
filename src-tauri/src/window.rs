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

#[tauri::command]
pub fn move_window_by(window: WebviewWindow, delta_x: i32, delta_y: i32) -> Result<(), String> {
    let position = window
        .outer_position()
        .map_err(|error| format!("failed to read window position: {error}"))?;

    window
        .set_position(PhysicalPosition::new(
            position.x + delta_x,
            position.y + delta_y,
        ))
        .map_err(|error| format!("failed to move window: {error}"))
}

#[tauri::command]
pub fn system_idle_millis() -> Result<u64, String> {
    system_idle_millis_impl()
}

#[tauri::command]
pub fn is_primary_mouse_down() -> bool {
    is_primary_mouse_down_impl()
}

#[cfg(windows)]
fn system_idle_millis_impl() -> Result<u64, String> {
    use std::mem::size_of;
    use windows::Win32::System::SystemInformation::GetTickCount;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

    let mut info = LASTINPUTINFO {
        cbSize: size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };

    unsafe {
        if !GetLastInputInfo(&mut info).as_bool() {
            return Err("failed to read system idle time".to_string());
        }

        Ok(GetTickCount().wrapping_sub(info.dwTime) as u64)
    }
}

#[cfg(not(windows))]
fn system_idle_millis_impl() -> Result<u64, String> {
    Ok(0)
}

#[cfg(windows)]
fn is_primary_mouse_down_impl() -> bool {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};

    unsafe { (GetAsyncKeyState(VK_LBUTTON.0 as i32) as u16 & 0x8000) != 0 }
}

#[cfg(not(windows))]
fn is_primary_mouse_down_impl() -> bool {
    false
}

#[tauri::command]
pub fn set_menu_hit_region_visible(visible: bool) {
    crate::hit_test::set_menu_hit_region_visible(visible);
}

#[tauri::command]
pub fn set_overlay_hit_region_visible(visible: bool) {
    crate::hit_test::set_overlay_hit_region_visible(visible);
}

#[tauri::command]
pub fn set_character_hit_region(region: crate::hit_test::HitRect) {
    crate::hit_test::set_character_hit_region(region);
}

#[tauri::command]
pub fn set_current_character_frame(frame_key: String) {
    crate::hit_test::set_current_character_frame(frame_key);
}

pub fn save_current_window_position(app: &AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };

    let position = window
        .outer_position()
        .map_err(|error| format!("failed to read window position: {error}"))?;

    save_window_position(
        app.clone(),
        WindowPosition {
            x: position.x,
            y: position.y,
        },
    )
}

#[tauri::command]
pub fn save_current_position(app: AppHandle) -> Result<(), String> {
    save_current_window_position(&app)
}

#[tauri::command]
pub fn exit_app(app: AppHandle) -> Result<(), String> {
    save_current_window_position(&app)?;
    app.exit(0);
    Ok(())
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
