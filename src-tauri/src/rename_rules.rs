use std::collections::HashMap;

pub struct RenameRule {
    pub category: &'static str,
    pub keywords: &'static [&'static str],
}

/// Fixed priority order — checked top to bottom, first match wins. Two
/// categories ("Qualifications" and "Employment Documents") are targeted by
/// two separate rules each (kept as distinct entries, not merged, so their
/// relative position in this priority order matches the spec exactly —
/// merging their keywords into one earlier entry would change how filenames
/// that also match an intervening rule get classified).
pub const RENAME_RULES: &[RenameRule] = &[
    RenameRule {
        category: "Passport",
        keywords: &["passport"],
    },
    RenameRule {
        category: "Qualifications",
        keywords: &["qualification", "academic", "transcript", "degree", "certificate"],
    },
    RenameRule {
        category: "Updated CV",
        keywords: &["cv", "resume"],
    },
    RenameRule {
        category: "English Score",
        keywords: &["english", "ielts", "pte", "toefl"],
    },
    RenameRule {
        category: "Employment Documents",
        keywords: &["employment", "work", "experience", "job"],
    },
    RenameRule {
        category: "Recommendation Letter",
        keywords: &["recommendation", "reference", "lor", "referee"],
    },
    RenameRule {
        category: "Application Form (College / University)",
        keywords: &["application form", "college form", "university form"],
    },
    RenameRule {
        category: "Statement of Purpose (SOP)",
        keywords: &["sop", "statement of purpose", "statement"],
    },
    RenameRule {
        category: "Immigration History",
        keywords: &["immigration", "history"],
    },
    RenameRule {
        category: "Agent Authorisation Form",
        keywords: &["authorisation", "authorization", "agent auth"],
    },
    RenameRule {
        category: "Min 2 years Work Experience (For PCL Nursing)",
        keywords: &["nursing", "pcl"],
    },
    RenameRule {
        category: "Registered Nurse Certificate (Compulsary for Nursing Programmes)",
        keywords: &["registered nurse"],
    },
    RenameRule {
        category: "Police Clearance Certificate (Mandatory for Nursing Pragrammes)",
        keywords: &["police clearance"],
    },
    RenameRule {
        category: "Enrolment Form",
        keywords: &["enrolment", "enrollment"],
    },
    RenameRule {
        category: "Visa",
        keywords: &["visa"],
    },
    RenameRule {
        category: "Employment Documents",
        keywords: &["internship"],
    },
    RenameRule {
        category: "Qualifications",
        keywords: &["grading", "grade"],
    },
];

/// The exhaustive set of document categories `classify()` can produce, in
/// first-occurrence order matching `RENAME_RULES` — deduplicated since a
/// couple of categories are targeted by more than one rule.
pub fn all_categories() -> Vec<&'static str> {
    let mut seen = std::collections::HashSet::new();
    RENAME_RULES
        .iter()
        .map(|rule| rule.category)
        .filter(|category| seen.insert(*category))
        .collect()
}

/// Classifies a raw filename into a canonical document category by
/// case-insensitive keyword match. Returns `None` if no rule matches (the
/// UI falls back to "Manually Rename" in that case).
pub fn classify(filename: &str) -> Option<&'static str> {
    let lower = filename.to_lowercase();
    RENAME_RULES
        .iter()
        .find(|rule| rule.keywords.iter().any(|kw| lower.contains(kw)))
        .map(|rule| rule.category)
}

/// Splits a filename into (stem, extension). Extension excludes the dot and
/// falls back to "pdf" when the original filename has none.
pub fn split_extension(filename: &str) -> &str {
    match filename.rsplit_once('.') {
        Some((_, ext)) if !ext.is_empty() => ext,
        _ => "pdf",
    }
}

/// Resolves final output filenames for a batch of classified files, handling
/// collisions (two files landing in the same category) with a numeric suffix:
/// "Academic Transcripts.pdf", "Academic Transcripts 2.pdf", ... Input order
/// is preserved (stable ZIP-entry order in the caller), so reruns against an
/// unchanged ZIP produce identical numbering. Categories are owned `String`s
/// rather than `&'static str` since they may come from a staff member's
/// manual dropdown choice, not just the built-in `RENAME_RULES` keywords.
pub fn resolve_collisions(classified: &[(String, String)]) -> Vec<(String, String)> {
    let mut counts: HashMap<&str, u32> = HashMap::new();
    classified
        .iter()
        .map(|(orig, category)| {
            let ext = split_extension(orig);
            let n = counts.entry(category.as_str()).or_insert(0);
            *n += 1;
            let final_name = if *n == 1 {
                format!("{category}.{ext}")
            } else {
                format!("{category} {n}.{ext}")
            };
            (orig.clone(), final_name)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_every_documented_keyword() {
        let cases: &[(&str, &str)] = &[
            ("Passport.pdf", "Passport"),
            ("student_passport_scan.PDF", "Passport"),
            ("qualification_cert.pdf", "Qualifications"),
            ("academic_record.pdf", "Qualifications"),
            ("transcript_2023.pdf", "Qualifications"),
            ("degree_certificate.pdf", "Qualifications"),
            ("cv.pdf", "Updated CV"),
            ("resume_final.pdf", "Updated CV"),
            ("english_test.pdf", "English Score"),
            ("ielts_result.pdf", "English Score"),
            ("pte_score.pdf", "English Score"),
            ("toefl.pdf", "English Score"),
            ("employment_letter.pdf", "Employment Documents"),
            ("work_history.pdf", "Employment Documents"),
            ("experience_letter.pdf", "Employment Documents"),
            ("job_offer.pdf", "Employment Documents"),
            ("internship_letter.pdf", "Employment Documents"),
            ("recommendation_letter.pdf", "Recommendation Letter"),
            ("reference.pdf", "Recommendation Letter"),
            ("lor1.pdf", "Recommendation Letter"),
            ("referee_form.pdf", "Recommendation Letter"),
            // "application form"/"college form"/"university form" require a
            // literal space too (see the nursing-keyword note above).
            ("application form 2023.pdf", "Application Form (College / University)"),
            ("college form.pdf", "Application Form (College / University)"),
            ("university form.pdf", "Application Form (College / University)"),
            ("SOP.pdf", "Statement of Purpose (SOP)"),
            ("statement_of_purpose.pdf", "Statement of Purpose (SOP)"),
            ("personal_statement.pdf", "Statement of Purpose (SOP)"),
            ("immigration_docs.pdf", "Immigration History"),
            ("travel_history.pdf", "Immigration History"),
            ("authorisation_form.pdf", "Agent Authorisation Form"),
            ("authorization_form.pdf", "Agent Authorisation Form"),
            ("agent auth.pdf", "Agent Authorisation Form"),
            // "nursing"/"pcl" only — a filename also containing an earlier
            // rule's keyword (e.g. "experience") would match that instead.
            ("nursing_document.pdf", "Min 2 years Work Experience (For PCL Nursing)"),
            ("pcl_document.pdf", "Min 2 years Work Experience (For PCL Nursing)"),
            // "registered nurse"/"police clearance" require a literal space
            // (real aenapply filenames are underscore-separated, so these
            // two rules are unlikely to ever fire against a real filename —
            // exercised here as written in the spec regardless), and must
            // avoid "certificate" or rule 2 would intercept first.
            (
                "registered nurse document.pdf",
                "Registered Nurse Certificate (Compulsary for Nursing Programmes)",
            ),
            (
                "police clearance form.pdf",
                "Police Clearance Certificate (Mandatory for Nursing Pragrammes)",
            ),
            ("enrolment_form.pdf", "Enrolment Form"),
            ("enrollment_form.pdf", "Enrolment Form"),
            ("visa_copy.pdf", "Visa"),
            ("grading_scale.pdf", "Qualifications"),
            ("grade_sheet.pdf", "Qualifications"),
        ];
        for (filename, expected) in cases {
            assert_eq!(classify(filename), Some(*expected), "for {filename}");
        }
    }

    #[test]
    fn returns_none_for_unrecognized_filename() {
        assert_eq!(classify("random_document.pdf"), None);
    }

    #[test]
    fn ambiguous_name_prefers_earlier_rule_in_priority_order() {
        // Contains both "academic" (rule 2, Qualifications) and "reference"
        // (rule 6, Recommendation Letter) — rule 2 wins.
        assert_eq!(classify("academic_reference.pdf"), Some("Qualifications"));
    }

    #[test]
    fn all_categories_has_no_duplicates() {
        let categories = all_categories();
        let unique: std::collections::HashSet<_> = categories.iter().collect();
        assert_eq!(categories.len(), unique.len());
        assert!(categories.contains(&"Qualifications"));
        assert!(categories.contains(&"Employment Documents"));
    }

    #[test]
    fn collisions_are_numbered_in_stable_order() {
        let classified = vec![
            ("t1.pdf".to_string(), "Qualifications".to_string()),
            ("t2.pdf".to_string(), "Qualifications".to_string()),
            ("t3.pdf".to_string(), "Qualifications".to_string()),
        ];
        let resolved = resolve_collisions(&classified);
        assert_eq!(
            resolved,
            vec![
                ("t1.pdf".to_string(), "Qualifications.pdf".to_string()),
                ("t2.pdf".to_string(), "Qualifications 2.pdf".to_string()),
                ("t3.pdf".to_string(), "Qualifications 3.pdf".to_string()),
            ]
        );
    }

    #[test]
    fn no_collision_when_categories_differ() {
        let classified = vec![
            ("p.pdf".to_string(), "Passport".to_string()),
            ("c.pdf".to_string(), "Updated CV".to_string()),
        ];
        let resolved = resolve_collisions(&classified);
        assert_eq!(
            resolved,
            vec![
                ("p.pdf".to_string(), "Passport.pdf".to_string()),
                ("c.pdf".to_string(), "Updated CV.pdf".to_string()),
            ]
        );
    }

    #[test]
    fn preserves_original_extension() {
        let classified = vec![("scan.jpg".to_string(), "Passport".to_string())];
        let resolved = resolve_collisions(&classified);
        assert_eq!(resolved, vec![("scan.jpg".to_string(), "Passport.jpg".to_string())]);
    }

    #[test]
    fn falls_back_to_pdf_when_no_extension() {
        assert_eq!(split_extension("noext"), "pdf");
    }
}
