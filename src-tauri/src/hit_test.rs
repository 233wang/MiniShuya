use std::sync::atomic::{AtomicBool, Ordering};

use crate::character_alpha_mask::{
    CHARACTER_ALPHA_HEIGHT, CHARACTER_ALPHA_MASK, CHARACTER_ALPHA_WIDTH,
};

static MENU_HIT_REGION_VISIBLE: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct HitPoint {
    pub x: i32,
    pub y: i32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
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

pub fn set_menu_hit_region_visible(visible: bool) {
    MENU_HIT_REGION_VISIBLE.store(visible, Ordering::Relaxed);
}

pub fn is_menu_hit_region_visible() -> bool {
    MENU_HIT_REGION_VISIBLE.load(Ordering::Relaxed)
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
            let regions = PetHitRegions {
                menu_visible: is_menu_hit_region_visible(),
                ..PetHitRegions::default()
            };
            let mut point = POINT {
                x: signed_low_word(lparam.0),
                y: signed_high_word(lparam.0),
            };

            if !windows::Win32::Graphics::Gdi::ScreenToClient(hwnd, &mut point).as_bool() {
                return DefSubclassProc(hwnd, msg, wparam, lparam);
            }

            if is_pet_interactive_point(
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
