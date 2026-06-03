use crate::hit_test::{
    is_character_opaque_at, is_pet_interactive_point, HitPoint, HitRect, PetHitRegions,
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
    }
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
