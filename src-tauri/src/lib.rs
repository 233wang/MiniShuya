use tauri::Manager;

mod character_alpha_mask;
mod chat_context;
mod chat_storage;
mod hit_test;
mod window;
mod window_position;

#[cfg(test)]
mod chat_context_tests;
#[cfg(test)]
mod chat_storage_tests;
#[cfg(test)]
mod hit_test_tests;
#[cfg(test)]
mod window_position_tests;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            window::exit_app,
            window::is_primary_mouse_down,
            window::load_window_position,
            window::move_window_by,
            window::save_current_position,
            window::save_window_position,
            window::set_character_hit_region,
            window::set_current_character_frame,
            window::set_menu_hit_region_visible,
            window::start_drag,
            window::system_idle_millis
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.set_always_on_top(true)?;
                window.set_decorations(false)?;
                hit_test::install_pet_hit_test(&window)?;

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
