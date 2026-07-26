use std::collections::HashMap;

pub struct RenameRule {
    pub category: &'static str,
    pub keywords: &'static [&'static str],
}

/// Fixed priority order — checked top to bottom, first match wins. This
/// resolves ambiguous filenames deterministically, e.g. "academic_reference.pdf"
/// matches "Academic Transcripts" (rule 2) before it could match "LOR" (rule 6).
pub const RENAME_RULES: &[RenameRule] = &[
    RenameRule {
        category: "Passport",
        keywords: &["passport"],
    },
    RenameRule {
        category: "Academic Transcripts",
        keywords: &["academic", "qualification", "transcript"],
    },
    RenameRule {
        category: "English Score",
        keywords: &["english", "ielts", "pte", "toefl"],
    },
    RenameRule {
        category: "SOP",
        keywords: &["sop", "statement"],
    },
    RenameRule {
        category: "CV",
        keywords: &["cv", "resume"],
    },
    RenameRule {
        category: "LOR",
        keywords: &["lor", "recommendation", "reference"],
    },
    RenameRule {
        category: "Work Experience",
        keywords: &["work", "employment"],
    },
    RenameRule {
        category: "Grading Scale",
        keywords: &["grading", "grade"],
    },
    RenameRule {
        category: "Agent Authorization Form",
        keywords: &["authorization", "agent"],
    },
];

/// The exhaustive list of document categories the checklist grid can display,
/// in the same order as `RENAME_RULES`.
pub fn all_categories() -> Vec<&'static str> {
    RENAME_RULES.iter().map(|rule| rule.category).collect()
}

/// Classifies a raw filename into a canonical document category by
/// case-insensitive keyword match. Returns `None` if no rule matches.
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
/// unchanged ZIP produce identical numbering.
pub fn resolve_collisions(classified: &[(String, &'static str)]) -> Vec<(String, String)> {
    let mut counts: HashMap<&'static str, u32> = HashMap::new();
    classified
        .iter()
        .map(|(orig, category)| {
            let ext = split_extension(orig);
            let n = counts.entry(category).or_insert(0);
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
            ("academic_record.pdf", "Academic Transcripts"),
            ("qualification_cert.pdf", "Academic Transcripts"),
            ("transcript_2023.pdf", "Academic Transcripts"),
            ("english_test.pdf", "English Score"),
            ("ielts_result.pdf", "English Score"),
            ("pte_score.pdf", "English Score"),
            ("toefl.pdf", "English Score"),
            ("SOP.pdf", "SOP"),
            ("statement_of_purpose.pdf", "SOP"),
            ("cv.pdf", "CV"),
            ("resume_final.pdf", "CV"),
            ("lor1.pdf", "LOR"),
            ("recommendation_letter.pdf", "LOR"),
            ("reference.pdf", "LOR"),
            ("work_history.pdf", "Work Experience"),
            ("employment_letter.pdf", "Work Experience"),
            ("grading_scale.pdf", "Grading Scale"),
            ("grade_sheet.pdf", "Grading Scale"),
            ("authorization_form.pdf", "Agent Authorization Form"),
            ("agent_agreement.pdf", "Agent Authorization Form"),
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
        // Contains both "academic" (rule 2) and "reference" (rule 6) — rule 2 wins.
        assert_eq!(classify("academic_reference.pdf"), Some("Academic Transcripts"));
    }

    #[test]
    fn collisions_are_numbered_in_stable_order() {
        let classified = vec![
            ("t1.pdf".to_string(), "Academic Transcripts"),
            ("t2.pdf".to_string(), "Academic Transcripts"),
            ("t3.pdf".to_string(), "Academic Transcripts"),
        ];
        let resolved = resolve_collisions(&classified);
        assert_eq!(
            resolved,
            vec![
                ("t1.pdf".to_string(), "Academic Transcripts.pdf".to_string()),
                ("t2.pdf".to_string(), "Academic Transcripts 2.pdf".to_string()),
                ("t3.pdf".to_string(), "Academic Transcripts 3.pdf".to_string()),
            ]
        );
    }

    #[test]
    fn no_collision_when_categories_differ() {
        let classified = vec![
            ("p.pdf".to_string(), "Passport"),
            ("c.pdf".to_string(), "CV"),
        ];
        let resolved = resolve_collisions(&classified);
        assert_eq!(
            resolved,
            vec![
                ("p.pdf".to_string(), "Passport.pdf".to_string()),
                ("c.pdf".to_string(), "CV.pdf".to_string()),
            ]
        );
    }

    #[test]
    fn preserves_original_extension() {
        let classified = vec![("scan.jpg".to_string(), "Passport")];
        let resolved = resolve_collisions(&classified);
        assert_eq!(resolved, vec![("scan.jpg".to_string(), "Passport.jpg".to_string())]);
    }

    #[test]
    fn falls_back_to_pdf_when_no_extension() {
        assert_eq!(split_extension("noext"), "pdf");
    }
}
