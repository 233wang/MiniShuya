use std::{
    sync::{
        atomic::{AtomicBool, AtomicI32, Ordering},
        Mutex,
    },
    thread,
    time::Duration,
};

use crate::character_alpha_mask::{
    CHARACTER_ALPHA_HEIGHT, CHARACTER_ALPHA_MASK, CHARACTER_ALPHA_WIDTH,
};

static MENU_HIT_REGION_VISIBLE: AtomicBool = AtomicBool::new(false);
static PET_CURSOR_MONITOR_STARTED: AtomicBool = AtomicBool::new(false);
static PET_WINDOW_IGNORES_CURSOR: AtomicBool = AtomicBool::new(false);
static CHARACTER_HIT_X: AtomicI32 = AtomicI32::new(4);
static CHARACTER_HIT_Y: AtomicI32 = AtomicI32::new(2);
static CHARACTER_HIT_WIDTH: AtomicI32 = AtomicI32::new(150);
static CHARACTER_HIT_HEIGHT: AtomicI32 = AtomicI32::new(225);
static CURRENT_CHARACTER_FRAME_KEY: Mutex<String> = Mutex::new(String::new());

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct HitPoint {
    pub x: i32,
    pub y: i32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HitRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl HitRect {
    pub fn contains(self, point: HitPoint) -> bool {
        point.x >= self.x
            && point.x < self.x + self.width
            && point.y >= self.y
            && point.y < self.y + self.height
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PetHitRegions {
    pub character: HitRect,
    pub menu: HitRect,
    pub menu_visible: bool,
}

impl Default for PetHitRegions {
    fn default() -> Self {
        Self {
            character: HitRect {
                x: 4,
                y: 2,
                width: 150,
                height: 225,
            },
            menu: HitRect {
                x: 153,
                y: 36,
                width: 85,
                height: 62,
            },
            menu_visible: false,
        }
    }
}

pub fn is_pet_interactive_point(point: HitPoint, regions: PetHitRegions) -> bool {
    is_character_opaque_at(point, regions.character)
        || (regions.menu_visible && regions.menu.contains(point))
}

pub fn should_ignore_cursor(point: HitPoint, regions: PetHitRegions) -> bool {
    !is_pet_interactive_point(point, regions)
}

pub fn set_menu_hit_region_visible(visible: bool) {
    MENU_HIT_REGION_VISIBLE.store(visible, Ordering::Relaxed);
}

pub fn set_character_hit_region(region: HitRect) {
    if region.width <= 0 || region.height <= 0 {
        return;
    }

    CHARACTER_HIT_X.store(region.x, Ordering::Relaxed);
    CHARACTER_HIT_Y.store(region.y, Ordering::Relaxed);
    CHARACTER_HIT_WIDTH.store(region.width, Ordering::Relaxed);
    CHARACTER_HIT_HEIGHT.store(region.height, Ordering::Relaxed);
}

pub fn is_menu_hit_region_visible() -> bool {
    MENU_HIT_REGION_VISIBLE.load(Ordering::Relaxed)
}

pub fn set_current_character_frame(frame_key: String) {
    if let Ok(mut current_frame_key) = CURRENT_CHARACTER_FRAME_KEY.lock() {
        *current_frame_key = frame_key;
    }
}

#[cfg(test)]
pub fn current_character_frame_key() -> String {
    CURRENT_CHARACTER_FRAME_KEY
        .lock()
        .map(|frame_key| frame_key.clone())
        .unwrap_or_default()
}

pub fn current_pet_hit_regions(menu_visible: bool) -> PetHitRegions {
    PetHitRegions {
        character: HitRect {
            x: CHARACTER_HIT_X.load(Ordering::Relaxed),
            y: CHARACTER_HIT_Y.load(Ordering::Relaxed),
            width: CHARACTER_HIT_WIDTH.load(Ordering::Relaxed),
            height: CHARACTER_HIT_HEIGHT.load(Ordering::Relaxed),
        },
        menu: PetHitRegions::default().menu,
        menu_visible,
    }
}

pub fn is_character_opaque_at(point: HitPoint, display_rect: HitRect) -> bool {
    if !display_rect.contains(point) {
        return false;
    }

    let local_x = (point.x - display_rect.x) as usize;
    let local_y = (point.y - display_rect.y) as usize;
    let display_width = display_rect.width as usize;
    let display_height = display_rect.height as usize;

    if display_width == 0 || display_height == 0 {
        return false;
    }

    let source_x = local_x * CHARACTER_ALPHA_WIDTH / display_width;
    let source_y = local_y * CHARACTER_ALPHA_HEIGHT / display_height;

    is_alpha_mask_opaque(source_x, source_y)
}

fn is_alpha_mask_opaque(x: usize, y: usize) -> bool {
    if x >= CHARACTER_ALPHA_WIDTH || y >= CHARACTER_ALPHA_HEIGHT {
        return false;
    }

    let index = y * CHARACTER_ALPHA_WIDTH + x;
    let byte = CHARACTER_ALPHA_MASK[index / 8];
    let mask = 1 << (index % 8);

    byte & mask != 0
}

#[cfg(windows)]
pub fn install_pet_hit_test(window: &tauri::WebviewWindow) -> Result<(), String> {
    use windows::Win32::UI::Shell::SetWindowSubclass;

    let hwnd = window
        .hwnd()
        .map_err(|error| format!("failed to read native window handle: {error}"))?;
    start_cursor_monitor(window.clone(), hwnd);
    unsafe {
        if SetWindowSubclass(hwnd, Some(pet_hit_test_proc), PET_HIT_TEST_SUBCLASS_ID, 0).as_bool() {
            Ok(())
        } else {
            Err("failed to install pet hit-test subclass".to_string())
        }
    }
}

#[cfg(not(windows))]
pub fn install_pet_hit_test(_window: &tauri::WebviewWindow) -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
const PET_HIT_TEST_SUBCLASS_ID: usize = 0x5a15;

#[cfg(windows)]
unsafe extern "system" fn pet_hit_test_proc(
    hwnd: windows::Win32::Foundation::HWND,
    msg: u32,
    wparam: windows::Win32::Foundation::WPARAM,
    lparam: windows::Win32::Foundation::LPARAM,
    _subclass_id: usize,
    _data: usize,
) -> windows::Win32::Foundation::LRESULT {
    use windows::Win32::Foundation::{LRESULT, POINT};
    use windows::Win32::UI::Shell::DefSubclassProc;
    use windows::Win32::UI::WindowsAndMessaging::{HTCLIENT, HTTRANSPARENT, WM_NCHITTEST};

    match msg {
        WM_NCHITTEST => {
            let regions = current_pet_hit_regions(is_menu_hit_region_visible());
            let mut point = POINT {
                x: signed_low_word(lparam.0),
                y: signed_high_word(lparam.0),
            };

            if !windows::Win32::Graphics::Gdi::ScreenToClient(hwnd, &mut point).as_bool() {
                return DefSubclassProc(hwnd, msg, wparam, lparam);
            }

            if !should_ignore_cursor(
                HitPoint {
                    x: point.x,
                    y: point.y,
                },
                regions,
            ) {
                LRESULT(HTCLIENT as isize)
            } else {
                LRESULT(HTTRANSPARENT as isize)
            }
        }
        _ => DefSubclassProc(hwnd, msg, wparam, lparam),
    }
}

#[cfg(windows)]
fn signed_low_word(value: isize) -> i32 {
    (value as u16) as i16 as i32
}

#[cfg(windows)]
fn signed_high_word(value: isize) -> i32 {
    ((value >> 16) as u16) as i16 as i32
}

#[cfg(windows)]
fn start_cursor_monitor(window: tauri::WebviewWindow, hwnd: windows::Win32::Foundation::HWND) {
    if PET_CURSOR_MONITOR_STARTED.swap(true, Ordering::Relaxed) {
        return;
    }

    let hwnd = hwnd.0 as isize;
    thread::spawn(move || loop {
        let hwnd = windows::Win32::Foundation::HWND(hwnd as *mut core::ffi::c_void);
        update_cursor_passthrough(&window, hwnd);
        thread::sleep(Duration::from_millis(16));
    });
}

#[cfg(not(windows))]
fn start_cursor_monitor() {}

#[cfg(windows)]
fn update_cursor_passthrough(
    window: &tauri::WebviewWindow,
    hwnd: windows::Win32::Foundation::HWND,
) {
    unsafe {
        let Some(point) = cursor_point_in_window(hwnd) else {
            set_window_cursor_passthrough(window, false);
            return;
        };

        let regions = current_pet_hit_regions(is_menu_hit_region_visible());
        set_window_cursor_passthrough(window, should_ignore_cursor(point, regions));
    }
}

#[cfg(windows)]
unsafe fn cursor_point_in_window(hwnd: windows::Win32::Foundation::HWND) -> Option<HitPoint> {
    use windows::Win32::{
        Foundation::{POINT, RECT},
        UI::WindowsAndMessaging::{GetCursorPos, GetWindowRect},
    };

    let mut cursor = POINT::default();
    let mut window = RECT::default();
    if GetCursorPos(&mut cursor).is_err() || GetWindowRect(hwnd, &mut window).is_err() {
        return None;
    }

    if cursor.x < window.left
        || cursor.x >= window.right
        || cursor.y < window.top
        || cursor.y >= window.bottom
    {
        return None;
    }

    Some(HitPoint {
        x: cursor.x - window.left,
        y: cursor.y - window.top,
    })
}

#[cfg(windows)]
fn set_window_cursor_passthrough(window: &tauri::WebviewWindow, should_ignore: bool) {
    if PET_WINDOW_IGNORES_CURSOR.swap(should_ignore, Ordering::Relaxed) == should_ignore {
        return;
    }

    let _ = window.set_ignore_cursor_events(should_ignore);
}
