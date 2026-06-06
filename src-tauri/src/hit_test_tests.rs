use crate::hit_test::{
    current_pet_hit_regions, is_character_opaque_at, is_character_opaque_at_frame,
    is_pet_interactive_point, set_character_hit_region, should_ignore_cursor, HitPoint, HitRect,
    PetHitRegions,
};

fn regions(menu_visible: bool) -> PetHitRegions {
    PetHitRegions {
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
        menu_visible,
        overlay_visible: false,
    }
}

#[test]
fn treats_entire_window_as_interactive_while_overlay_is_visible() {
    let mut regions = regions(false);
    regions.overlay_visible = true;

    assert!(!should_ignore_cursor(HitPoint { x: 499, y: 469 }, regions));
}

#[test]
fn treats_opaque_character_pixel_as_interactive() {
    assert!(is_pet_interactive_point(
        HitPoint { x: 80, y: 120 },
        regions(false)
    ));
}

#[test]
fn treats_transparent_character_pixel_as_transparent() {
    assert!(!is_pet_interactive_point(
        HitPoint { x: 10, y: 10 },
        regions(false)
    ));
}

#[test]
fn maps_display_coordinate_to_character_alpha_mask() {
    let character = regions(false).character;

    assert!(is_character_opaque_at(
        HitPoint { x: 80, y: 120 },
        character
    ));
    assert!(!is_character_opaque_at(
        HitPoint { x: 10, y: 10 },
        character
    ));
}

#[test]
fn uses_frame_specific_alpha_masks() {
    let character = regions(false).character;
    let point = HitPoint { x: 53, y: 130 };

    assert!(!is_character_opaque_at_frame(point, character, "idle-01"));
    assert!(is_character_opaque_at_frame(
        point,
        character,
        "dragging-01"
    ));
}

#[test]
fn uses_greeting_alpha_masks() {
    let character = regions(false).character;
    let point = HitPoint { x: 90, y: 25 };

    assert!(!is_character_opaque_at_frame(point, character, "idle-01"));
    assert!(is_character_opaque_at_frame(
        point,
        character,
        "greeting-04"
    ));
}

#[test]
fn treats_menu_area_as_interactive_only_when_menu_is_visible() {
    assert!(is_pet_interactive_point(
        HitPoint { x: 200, y: 60 },
        regions(true)
    ));
    assert!(!is_pet_interactive_point(
        HitPoint { x: 200, y: 60 },
        regions(false)
    ));
}

#[test]
fn treats_empty_window_area_as_transparent() {
    assert!(!is_pet_interactive_point(
        HitPoint { x: 220, y: 210 },
        regions(false)
    ));
}

#[test]
fn treats_rect_right_and_bottom_edges_as_outside() {
    assert!(!is_character_opaque_at(
        HitPoint { x: 154, y: 227 },
        regions(false).character
    ));
}

#[test]
fn ignores_cursor_on_transparent_pixels_without_cropping_visuals() {
    assert!(should_ignore_cursor(
        HitPoint { x: 10, y: 10 },
        regions(false)
    ));
    assert!(should_ignore_cursor(
        HitPoint { x: 220, y: 210 },
        regions(false)
    ));
    assert!(!should_ignore_cursor(
        HitPoint { x: 80, y: 120 },
        regions(false)
    ));
}

#[test]
fn does_not_ignore_cursor_on_visible_menu() {
    assert!(should_ignore_cursor(
        HitPoint { x: 200, y: 60 },
        regions(false)
    ));
    assert!(!should_ignore_cursor(
        HitPoint { x: 200, y: 60 },
        regions(true)
    ));
}

#[test]
fn uses_latest_reported_character_hit_region() {
    set_character_hit_region(HitRect {
        x: 100,
        y: 100,
        width: 150,
        height: 225,
    });

    let regions = current_pet_hit_regions(false);

    assert_eq!(
        regions.character,
        HitRect {
            x: 100,
            y: 100,
            width: 150,
            height: 225,
        }
    );
    assert!(should_ignore_cursor(HitPoint { x: 80, y: 120 }, regions));
    assert!(!should_ignore_cursor(HitPoint { x: 176, y: 218 }, regions));
}

#[test]
fn stores_current_character_frame_key() {
    crate::hit_test::set_current_character_frame("petting-01".to_string());

    assert_eq!(
        crate::hit_test::current_character_frame_key(),
        "petting-01".to_string()
    );
}
