use crate::config;
use serde::Deserialize;
use std::collections::HashMap;
use tauri::AppHandle;

const MANUALLY_RENAME: &str = "Manually Rename";

/// Used when a student's country either isn't a key in `countries` at all,
/// or maps to an empty list (as new/not-yet-filled-in countries do in
/// university_requirements.json) — the common set of documents every
/// application needs, independent of any country-specific paperwork.
const GENERIC_CATEGORIES: &[&str] = &[
    "Passport",
    "Qualifications",
    "Updated CV",
    "English Score",
    "Employment Documents",
    "Recommendation Letter",
    "Application Form (College / University)",
    "Statement of Purpose (SOP)",
    "Immigration History",
    "Agent Authorisation Form",
];

/// Only the `countries` key of university_requirements.json — the other
/// top-level keys (`default_required`/`overrides`, used by checklist.rs for
/// the missing-document check) are irrelevant here and simply ignored by
/// serde rather than parsed by this struct.
#[derive(Debug, Clone, Deserialize, Default)]
struct CountriesFile {
    #[serde(default)]
    countries: HashMap<String, Vec<String>>,
}

fn normalize(name: &str) -> String {
    name.trim().to_lowercase()
}

/// Returns the rename-dropdown options for a student's country, read from
/// university_requirements.json's `countries` map — so adding or editing a
/// country's document list is just an edit to that file, no code change.
///
/// Falls back to `GENERIC_CATEGORIES` if the country isn't listed yet (or
/// its list is empty), and always guarantees "Manually Rename" is present
/// as the last option. Degrades gracefully to the generic list on any
/// missing/unreadable/malformed file rather than failing the whole detail
/// screen over an optional lookup.
pub fn categories_for_country(app: &AppHandle, country: &str) -> Vec<String> {
    let key = normalize(country);

    let country_list = config::university_requirements_path(app)
        .ok()
        .and_then(|path| std::fs::read_to_string(path).ok())
        .and_then(|raw| serde_json::from_str::<CountriesFile>(&raw).ok())
        .and_then(|file| {
            file.countries
                .into_iter()
                .find(|(name, _)| normalize(name) == key)
                .map(|(_, list)| list)
        })
        .filter(|list| !list.is_empty());

    let mut categories =
        country_list.unwrap_or_else(|| GENERIC_CATEGORIES.iter().map(|s| s.to_string()).collect());

    categories.retain(|c| c != MANUALLY_RENAME);
    categories.push(MANUALLY_RENAME.to_string());
    categories
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generic_categories_end_with_manually_rename_once_appended() {
        let mut categories: Vec<String> = GENERIC_CATEGORIES.iter().map(|s| s.to_string()).collect();
        categories.retain(|c| c != MANUALLY_RENAME);
        categories.push(MANUALLY_RENAME.to_string());
        assert_eq!(categories.last().map(String::as_str), Some(MANUALLY_RENAME));
        assert_eq!(categories.iter().filter(|c| c.as_str() == MANUALLY_RENAME).count(), 1);
    }

    #[test]
    fn parses_countries_key_and_ignores_other_top_level_keys() {
        let raw = r#"{
            "default_required": ["Passport"],
            "overrides": {},
            "countries": {
                "New Zealand": ["Passport", "Qualifications", "Manually Rename"],
                "UK": []
            }
        }"#;
        let file: CountriesFile = serde_json::from_str(raw).unwrap();
        assert_eq!(file.countries.len(), 2);
        assert_eq!(
            file.countries.get("New Zealand"),
            Some(&vec!["Passport".to_string(), "Qualifications".to_string(), "Manually Rename".to_string()])
        );
        assert_eq!(file.countries.get("UK"), Some(&vec![]));
    }
}
