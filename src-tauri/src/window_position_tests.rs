use crate::window_position::{sanitize_position, WindowPosition};

#[test]
fn accepts_normal_position() {
    let position = sanitize_position(WindowPosition { x: 120, y: 240 });
    assert_eq!(position, WindowPosition { x: 120, y: 240 });
}

#[test]
fn clamps_large_negative_position_to_zero() {
    let position = sanitize_position(WindowPosition { x: -9000, y: -10 });
    assert_eq!(position, WindowPosition { x: 0, y: 0 });
}

#[test]
fn clamps_extreme_position_to_reasonable_desktop_bounds() {
    let position = sanitize_position(WindowPosition { x: 99999, y: 99999 });
    assert_eq!(position, WindowPosition { x: 20000, y: 20000 });
}
