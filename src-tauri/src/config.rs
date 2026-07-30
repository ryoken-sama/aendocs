use crate::errors::AppError;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

const SETTINGS_FILE: &str = "settings.json";
const THEME_FILE: &str = "theme.json";
const UNIVERSITY_REQUIREMENTS_FILE: &str = "university_requirements.json";
const UNIVERSITY_REQUIREMENTS_RESOURCE: &str = "resources/university_requirements.default.json";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Settings {
    pub email: String,
    pub output_folder: String,
    /// Whether the currently-saved `email` has a matching keyring password
    /// that should be used for silent auto-login on the next launch — set
    /// only via a Login screen sign-in with "Remember me" checked (see
    /// `auth::sign_in`), not by anything on the Settings screen.
    #[serde(default)]
    pub remember_me: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemePreference {
    pub dark_mode: bool,
}

impl Default for ThemePreference {
    fn default() -> Self {
        Self { dark_mode: true }
    }
}

pub fn app_data_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
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

fn theme_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(app_data_dir(app)?.join(THEME_FILE))
}

pub fn load_settings(app: &AppHandle) -> Result<Settings, AppError> {
    let path = settings_path(app)?;
    if !path.exists() {
        return Ok(Settings::default());
    }
    let raw = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&raw)?)
}

fn write_settings(app: &AppHandle, settings: &Settings) -> Result<(), AppError> {
    let path = settings_path(app)?;
    let raw = serde_json::to_string_pretty(settings)?;
    std::fs::write(path, raw)?;
    Ok(())
}

/// Settings screen's only persisted field now — email/remember_me are
/// login-flow concerns (see `save_account`/`clear_account`), not something
/// this screen edits.
pub fn save_output_folder(app: &AppHandle, output_folder: &str) -> Result<(), AppError> {
    let mut settings = load_settings(app)?;
    settings.output_folder = output_folder.to_string();
    write_settings(app, &settings)
}

/// Records "this email is remembered" for next launch's auto-login check —
/// called only after a successful sign-in with "Remember me" checked. The
/// keyring password itself is stored separately (see `keyring_store`).
pub fn save_account(app: &AppHandle, email: &str, remember_me: bool) -> Result<(), AppError> {
    let mut settings = load_settings(app)?;
    settings.email = email.to_string();
    settings.remember_me = remember_me;
    write_settings(app, &settings)
}

/// Forgets the saved account (but leaves `output_folder` untouched) — the
/// next launch will show the Login screen instead of attempting
/// auto-login. Callers are responsible for also deleting the keyring
/// entry (see `auth::logout_and_maybe_forget`/`auth::change_account`).
pub fn clear_account(app: &AppHandle) -> Result<(), AppError> {
    let mut settings = load_settings(app)?;
    settings.email = String::new();
    settings.remember_me = false;
    write_settings(app, &settings)
}

/// Loads the persisted light/dark theme preference, defaulting to dark mode
/// (per the app's default) if no preference has been saved yet.
pub fn load_theme_preference(app: &AppHandle) -> Result<ThemePreference, AppError> {
    let path = theme_path(app)?;
    if !path.exists() {
        return Ok(ThemePreference::default());
    }
    let raw = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&raw)?)
}

pub fn save_theme_preference(app: &AppHandle, preference: &ThemePreference) -> Result<(), AppError> {
    let path = theme_path(app)?;
    let raw = serde_json::to_string_pretty(preference)?;
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
