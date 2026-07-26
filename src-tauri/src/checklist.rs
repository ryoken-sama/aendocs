use crate::errors::AppError;
use crate::rename_rules;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;

#[derive(Debug, Clone, Deserialize)]
pub struct UniversityOverride {
    #[serde(default)]
    pub required: Option<Vec<String>>,
    #[serde(default)]
    pub additional: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UniversityRequirements {
    pub default_required: Vec<String>,
    #[serde(default)]
    pub overrides: HashMap<String, UniversityOverride>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DocStatus {
    Present,
    Missing,
    NotRequired,
}

#[derive(Debug, Clone, Serialize)]
pub struct DocRequirementStatus {
    pub category: String,
    pub status: DocStatus,
}

fn normalize(name: &str) -> String {
    name.trim().to_lowercase()
}

pub fn load_requirements(path: &Path) -> Result<UniversityRequirements, AppError> {
    let raw = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&raw)?)
}

/// Merges the default required-doc list with any per-university override
/// (case-insensitive, trimmed match on university name — an override's
/// `required` list *replaces* the default list, and `additional` adds extra
/// docs on top), then compares against the categories actually present to
/// compute a status per category across the full known category set.
pub fn compute_status(
    university: &str,
    present_categories: &[String],
    requirements: &UniversityRequirements,
) -> Vec<DocRequirementStatus> {
    let key = normalize(university);
    let override_entry = requirements
        .overrides
        .iter()
        .find(|(name, _)| normalize(name) == key)
        .map(|(_, o)| o);

    let mut required: HashSet<String> = match override_entry.and_then(|o| o.required.clone()) {
        Some(list) => list.into_iter().collect(),
        None => requirements.default_required.iter().cloned().collect(),
    };
    if let Some(additional) = override_entry.and_then(|o| o.additional.clone()) {
        required.extend(additional);
    }

    let present: HashSet<&String> = present_categories.iter().collect();

    rename_rules::all_categories()
        .into_iter()
        .map(|category| {
            let status = if required.contains(category) {
                if present.contains(&category.to_string()) {
                    DocStatus::Present
                } else {
                    DocStatus::Missing
                }
            } else {
                DocStatus::NotRequired
            };
            DocRequirementStatus {
                category: category.to_string(),
                status,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_requirements() -> UniversityRequirements {
        UniversityRequirements {
            default_required: vec![
                "Passport".into(),
                "Academic Transcripts".into(),
                "English Score".into(),
                "SOP".into(),
                "CV".into(),
                "LOR".into(),
            ],
            overrides: HashMap::new(),
        }
    }

    #[test]
    fn default_required_docs_present_and_missing() {
        let reqs = base_requirements();
        let present = vec!["Passport".to_string(), "CV".to_string()];
        let statuses = compute_status("Some University", &present, &reqs);

        let get = |cat: &str| statuses.iter().find(|s| s.category == cat).unwrap().status;
        assert_eq!(get("Passport"), DocStatus::Present);
        assert_eq!(get("CV"), DocStatus::Present);
        assert_eq!(get("SOP"), DocStatus::Missing);
        assert_eq!(get("Work Experience"), DocStatus::NotRequired);
    }

    #[test]
    fn override_drops_a_default_required_doc() {
        let mut reqs = base_requirements();
        reqs.overrides.insert(
            "Example University".into(),
            UniversityOverride {
                required: Some(vec![
                    "Passport".into(),
                    "Academic Transcripts".into(),
                    "SOP".into(),
                    "CV".into(),
                    "LOR".into(),
                ]),
                additional: None,
            },
        );
        let statuses = compute_status("example university", &[], &reqs);
        let get = |cat: &str| statuses.iter().find(|s| s.category == cat).unwrap().status;
        assert_eq!(get("English Score"), DocStatus::NotRequired);
        assert_eq!(get("Passport"), DocStatus::Missing);
    }

    #[test]
    fn override_adds_an_extra_required_doc() {
        let mut reqs = base_requirements();
        reqs.overrides.insert(
            "Example University".into(),
            UniversityOverride {
                required: None,
                additional: Some(vec!["Grading Scale".into()]),
            },
        );
        let statuses = compute_status("  Example University  ", &[], &reqs);
        let get = |cat: &str| statuses.iter().find(|s| s.category == cat).unwrap().status;
        assert_eq!(get("Grading Scale"), DocStatus::Missing);
    }

    #[test]
    fn university_name_matching_is_case_insensitive_and_trimmed() {
        let mut reqs = base_requirements();
        reqs.overrides.insert(
            "Test Uni".into(),
            UniversityOverride {
                required: Some(vec!["Passport".into()]),
                additional: None,
            },
        );
        let statuses = compute_status("  test uni  ", &["Passport".to_string()], &reqs);
        let get = |cat: &str| statuses.iter().find(|s| s.category == cat).unwrap().status;
        assert_eq!(get("Passport"), DocStatus::Present);
        assert_eq!(get("CV"), DocStatus::NotRequired);
    }
}
