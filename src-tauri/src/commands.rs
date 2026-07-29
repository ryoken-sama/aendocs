use crate::app_state::AppState;
use crate::auth::{self, LoginResult};
use crate::config::{self, Settings, SettingsInput, ThemePreference};
use crate::document_categories;
use crate::download::{self, DownloadSummary};
use crate::errors::AppError;
use crate::keyring_store;
use crate::profile::{self, UserProfile};
use crate::students::{
    self, FilterOptions, RecentApplication, SearchFilters, Section, StudentApplicationLink, StudentDetail,
    StudentListResult, StudentSearchResult, StudentSummary, StudentsListFilter,
};
use std::collections::HashMap;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn get_profile(app: AppHandle, state: State<'_, AppState>) -> Result<UserProfile, AppError> {
    profile::get_profile(&app, &state).await
}

#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<(), AppError> {
    auth::logout(&state);
    profile::clear(&state);
    Ok(())
}

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
pub async fn get_theme_preference(app: AppHandle) -> Result<ThemePreference, AppError> {
    config::load_theme_preference(&app)
}

#[tauri::command]
pub async fn save_theme_preference(app: AppHandle, preference: ThemePreference) -> Result<(), AppError> {
    config::save_theme_preference(&app, &preference)
}

#[tauri::command]
pub async fn search_students(
    app: AppHandle,
    state: State<'_, AppState>,
    query: String,
    start: u32,
    length: u32,
    section: String,
    branch_id: String,
    agent_id: String,
    country_id: String,
    institution_id: String,
) -> Result<StudentSearchResult, AppError> {
    let section = Section::from_key(&section)?;
    let filters = SearchFilters {
        branch_id: &branch_id,
        agent_id: &agent_id,
        country_id: &country_id,
        institution_id: &institution_id,
    };
    students::search_students(&app, &state, &query, start, length, section, &filters).await
}

#[tauri::command]
pub async fn get_filter_options(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<FilterOptions, AppError> {
    students::get_filter_options(&app, &state).await
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
pub async fn get_document_categories(app: AppHandle, country: String) -> Result<Vec<String>, AppError> {
    Ok(document_categories::categories_for_country(&app, &country))
}

#[tauri::command]
pub async fn search_students_list(
    app: AppHandle,
    state: State<'_, AppState>,
    query: String,
    start: u32,
    length: u32,
    branch_id: String,
    agent_id: String,
    country_id: String,
) -> Result<StudentListResult, AppError> {
    let filter = StudentsListFilter {
        branch_id: &branch_id,
        agent_id: &agent_id,
        country_id: &country_id,
    };
    students::search_students_list(&app, &state, &query, start, length, &filter).await
}

#[tauri::command]
pub async fn get_student_applications(
    app: AppHandle,
    state: State<'_, AppState>,
    students_id: String,
) -> Result<Vec<StudentApplicationLink>, AppError> {
    students::get_student_applications(&app, &state, &students_id).await
}

#[tauri::command]
pub async fn get_recent_applications(
    app: AppHandle,
    state: State<'_, AppState>,
    length: u32,
) -> Result<Vec<RecentApplication>, AppError> {
    students::get_recent_applications(&app, &state, length).await
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
