use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct WindowPosition {
    pub x: i32,
    pub y: i32,
}

pub fn default_position() -> WindowPosition {
    WindowPosition { x: 80, y: 120 }
}

pub fn sanitize_position(position: WindowPosition) -> WindowPosition {
    WindowPosition {
        x: position.x.clamp(0, 20_000),
        y: position.y.clamp(0, 20_000),
    }
}
