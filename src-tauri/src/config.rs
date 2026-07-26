use crate::errors::AppError;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

const SETTINGS_FILE: &str = "settings.json";
const UNIVERSITY_REQUIREMENTS_FILE: &str = "university_requirements.json";
const UNIVERSITY_REQUIREMENTS_RESOURCE: &str = "resources/university_requirements.default.json";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Settings {
    pub email: String,
    pub output_folder: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SettingsInput {
    pub email: String,
    pub output_folder: String,
    pub password: Option<String>,
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(app_data_dir(app)?.join(SETTINGS_FILE))
}

pub fn university_requirements_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(app_data_dir(app)?.join(UNIVERSITY_REQUIREMENTS_FILE))
}

pub fn load_settings(app: &AppHandle) -> Result<Settings, AppError> {
    let path = settings_path(app)?;
    if !path.exists() {
        return Ok(Settings::default());
    }
    let raw = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&raw)?)
}

pub fn save_settings(app: &AppHandle, input: &SettingsInput) -> Result<(), AppError> {
    let settings = Settings {
        email: input.email.clone(),
        output_folder: input.output_folder.clone(),
    };
    let path = settings_path(app)?;
    let raw = serde_json::to_string_pretty(&settings)?;
    std::fs::write(path, raw)?;
    Ok(())
}

/// Seeds the app-data copy of university_requirements.json from the bundled
/// default resource on first run only. Once the live copy exists, it is never
/// overwritten so hand-edits persist across app updates.
pub fn ensure_university_requirements_exists(app: &AppHandle) -> Result<(), AppError> {
    let live_path = university_requirements_path(app)?;
    if live_path.exists() {
        return Ok(());
    }
    let resource_path = app
        .path()
        .resolve(UNIVERSITY_REQUIREMENTS_RESOURCE, BaseDirectory::Resource)?;
    std::fs::copy(resource_path, live_path)?;
    Ok(())
}
