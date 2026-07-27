mod app_state;
mod auth;
mod checklist;
mod commands;
mod config;
mod download;
mod errors;
mod http_client;
mod keyring_store;
mod path_builder;
mod progress;
mod rename_rules;
mod students;

use app_state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .setup(|app| {
            let handle = app.handle().clone();
            config::ensure_university_requirements_exists(&handle)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::test_login,
            commands::search_students,
            commands::get_student_detail,
            commands::download_and_organize,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
