use tauri::Manager;

mod window;
mod window_position;

#[cfg(test)]
mod window_position_tests;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            window::load_window_position,
            window::save_current_position,
            window::save_window_position,
            window::start_drag
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.set_always_on_top(true)?;
                window.set_decorations(false)?;

                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                        let _ = crate::window::save_current_window_position(&app_handle);
                    }
                });
            }
            window::apply_saved_position(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MiniShuya");
}
