mod app_state;
mod auth;
mod checklist;
mod commands;
mod config;
mod document_categories;
mod download;
mod errors;
mod http_client;
mod keyring_store;
mod path_builder;
mod profile;
mod progress;
mod rename_rules;
mod students;

use app_state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState::new())
        .setup(|app| {
            let handle = app.handle().clone();
            config::ensure_university_requirements_exists(&handle)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_profile,
            commands::logout,
            commands::get_settings,
            commands::save_settings,
            commands::test_login,
            commands::get_theme_preference,
            commands::save_theme_preference,
            commands::search_students,
            commands::get_filter_options,
            commands::get_student_detail,
            commands::get_document_categories,
            commands::search_students_list,
            commands::get_student_applications,
            commands::download_and_organize,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
