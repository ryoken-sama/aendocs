use crate::app_state::AppState;
use crate::auth::{self, LoginResult};
use crate::config::{self, Settings, SettingsInput};
use crate::download::{self, DownloadSummary};
use crate::errors::AppError;
use crate::keyring_store;
use crate::students::{self, StudentDetail, StudentSearchResult, StudentSummary};
use std::collections::HashMap;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<Settings, AppError> {
    config::load_settings(&app)
}

#[tauri::command]
pub async fn save_settings(app: AppHandle, settings: SettingsInput) -> Result<(), AppError> {
    if let Some(password) = &settings.password {
        keyring_store::set_password(&settings.email, password)?;
    }
    config::save_settings(&app, &settings)
}

#[tauri::command]
pub async fn test_login(app: AppHandle, state: State<'_, AppState>) -> Result<LoginResult, AppError> {
    Ok(auth::test_login(&app, &state).await)
}

#[tauri::command]
pub async fn search_students(
    app: AppHandle,
    state: State<'_, AppState>,
    query: String,
    start: u32,
    length: u32,
) -> Result<StudentSearchResult, AppError> {
    students::search_students(&app, &state, &query, start, length).await
}

#[tauri::command]
pub async fn get_student_detail(
    app: AppHandle,
    state: State<'_, AppState>,
    student_id: String,
) -> Result<StudentDetail, AppError> {
    students::get_student_detail(&app, &state, &student_id).await
}

#[tauri::command]
pub async fn download_and_organize(
    app: AppHandle,
    state: State<'_, AppState>,
    student: StudentSummary,
    category_overrides: HashMap<String, String>,
) -> Result<DownloadSummary, AppError> {
    download::download_and_organize(&app, &state, &student, &category_overrides).await
}
