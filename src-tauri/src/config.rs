use crate::errors::AppError;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

const SETTINGS_FILE: &str = "settings.json";
const THEME_FILE: &str = "theme.json";
const UNIVERSITY_REQUIREMENTS_FILE: &str = "university_requirements.json";
const UNIVERSITY_REQUIREMENTS_RESOURCE: &str = "resources/university_requirements.default.json";
const LAST_VERSION_FILE: &str = "last_version.txt";

/// Filenames in the app data directory that represent genuine user
/// data — settings, the saved theme preference, and the (possibly
/// hand-edited) university requirements mapping — plus the version marker
/// itself. Never swept by `clear_stale_cache_on_update`. Everything else
/// living directly in that directory is fetched/derived data (currently
/// just the filter options cache — see FILTER_OPTIONS_CACHE_FILE in
/// students/mod.rs) that's safe to lose and gets refetched on demand; an
/// allowlist rather than naming each cache file here means a *new* cache
/// file added later is swept automatically too, with nothing to remember
/// to update.
const PROTECTED_FILES: &[&str] = &[SETTINGS_FILE, THEME_FILE, UNIVERSITY_REQUIREMENTS_FILE, LAST_VERSION_FILE];

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

fn last_version_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(app_data_dir(app)?.join(LAST_VERSION_FILE))
}

/// Deletes every top-level file in `dir` whose name isn't in
/// `PROTECTED_FILES` — subdirectories are left alone (this app has never
/// created any) and a missing/unreadable directory is treated as "nothing
/// to sweep" rather than an error, since a fresh install may not have one
/// yet. Split out from `clear_stale_cache_on_update` so it's testable
/// without a real `AppHandle`.
fn sweep_non_protected_files(dir: &std::path::Path) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let is_protected = path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| PROTECTED_FILES.contains(&name));
        if !is_protected {
            let _ = std::fs::remove_file(&path);
        }
    }
}

/// Detects a version change — an update having just installed and
/// restarted the app — by comparing the version recorded on the previous
/// launch against the one running now, and if they differ (including a
/// fresh install with nothing recorded yet), sweeps every non-protected
/// file (see `PROTECTED_FILES`/`sweep_non_protected_files`) out of the app
/// data directory before recording the new version. This is what keeps a
/// cache format that changed between versions (or one that simply went
/// stale) from ever carrying over and causing confusing failures after an
/// update — credentials (keyring, separate from this directory) and user
/// settings are untouched either way. Called once from `run()`'s
/// `.setup()`, before anything else reads or writes into this directory.
pub fn clear_stale_cache_on_update(app: &AppHandle) -> Result<(), AppError> {
    let current_version = app.package_info().version.to_string();
    let version_path = last_version_path(app)?;

    let previous_version = std::fs::read_to_string(&version_path).ok();
    if previous_version.as_deref() == Some(current_version.as_str()) {
        return Ok(());
    }

    sweep_non_protected_files(&app_data_dir(app)?);

    std::fs::write(&version_path, &current_version)?;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sweeps_only_non_protected_files() {
        let dir = std::env::temp_dir().join(format!("aendocs_config_test_{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();

        let protected = [SETTINGS_FILE, THEME_FILE, UNIVERSITY_REQUIREMENTS_FILE, LAST_VERSION_FILE];
        let cache_files = ["filter_options_cache.json", "some_future_cache.json"];
        for name in protected.iter().chain(cache_files.iter()) {
            std::fs::write(dir.join(name), "x").unwrap();
        }

        sweep_non_protected_files(&dir);

        for name in protected {
            assert!(dir.join(name).exists(), "expected {name} to survive the sweep");
        }
        for name in cache_files {
            assert!(!dir.join(name).exists(), "expected {name} to be swept");
        }

        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn tolerates_a_missing_directory() {
        let dir = std::env::temp_dir().join(format!("aendocs_config_test_missing_{}", std::process::id()));
        sweep_non_protected_files(&dir); // must not panic
    }
}
