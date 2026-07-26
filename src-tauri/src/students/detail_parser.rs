use crate::errors::AppError;
use crate::rename_rules;
use scraper::{Html, Selector};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct DetailDocEntry {
    /// A canonical document category (e.g. "Passport"), classified from
    /// whatever raw label text appears on the detail page — never a raw
    /// filename. Unrecognized labels are dropped rather than surfaced, since
    /// the ZIP contents after download remain the authoritative source.
    pub label: String,
    pub present: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct StudentDetail {
    pub id: String,
    pub name: String,
    pub branch: String,
    pub country: String,
    pub university: String,
    pub program: String,
    pub documents: Vec<DetailDocEntry>,
}

// Named, swappable CSS selector constants — first guesses (plan §6b). Update
// these once the real detail-page HTML has been captured from a live login.
const SELECTOR_STUDENT_NAME: &str = "h1.student-name, .page-title";
const SELECTOR_BRANCH: &str = "[data-field='branch'], .branch-name";
const SELECTOR_COUNTRY: &str = "[data-field='country'], .country-name";
const SELECTOR_UNIVERSITY: &str = "[data-field='university'], .university-name";
const SELECTOR_PROGRAM: &str = "[data-field='program'], .program-name";
const SELECTOR_DOC_ROWS: &str = "table.documents tr, .document-list .document-item";
const SELECTOR_DOC_LABEL: &str = "td:first-child, .document-name";
const SELECTOR_DOC_PRESENT_HINT: &str = "a.download-link, .document-status.present";

fn select_text(document: &Html, selector_str: &str) -> String {
    Selector::parse(selector_str)
        .ok()
        .and_then(|sel| document.select(&sel).next())
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default()
}

/// Parses the student detail page HTML. Selectors that match nothing yield
/// empty strings / an empty document list rather than an error — a wrong or
/// stale selector degrades gracefully instead of breaking the detail screen
/// (see plan §6b).
pub fn parse_student_detail_html(html: &str, student_id: &str) -> Result<StudentDetail, AppError> {
    let document = Html::parse_document(html);

    let name = select_text(&document, SELECTOR_STUDENT_NAME);
    let branch = select_text(&document, SELECTOR_BRANCH);
    let country = select_text(&document, SELECTOR_COUNTRY);
    let university = select_text(&document, SELECTOR_UNIVERSITY);
    let program = select_text(&document, SELECTOR_PROGRAM);

    let mut documents: Vec<DetailDocEntry> = Vec::new();
    if let Ok(row_selector) = Selector::parse(SELECTOR_DOC_ROWS) {
        let label_selector = Selector::parse(SELECTOR_DOC_LABEL).ok();
        let present_selector = Selector::parse(SELECTOR_DOC_PRESENT_HINT).ok();

        for row in document.select(&row_selector) {
            let raw_label = label_selector
                .as_ref()
                .and_then(|sel| row.select(sel).next())
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_default();
            if raw_label.is_empty() {
                continue;
            }

            let present = present_selector
                .as_ref()
                .map(|sel| row.select(sel).next().is_some())
                .unwrap_or(false);

            let Some(category) = rename_rules::classify(&raw_label) else {
                continue;
            };

            if let Some(existing) = documents.iter_mut().find(|d| d.label == category) {
                existing.present = existing.present || present;
            } else {
                documents.push(DetailDocEntry {
                    label: category.to_string(),
                    present,
                });
            }
        }
    }

    Ok(StudentDetail {
        id: student_id.to_string(),
        name,
        branch,
        country,
        university,
        program,
        documents,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE_HTML: &str = r#"
        <html>
          <body>
            <h1 class="student-name">Jane Doe</h1>
            <span data-field="branch">Access Kathmandu</span>
            <span data-field="country">Nepal</span>
            <span data-field="university">University of Melbourne</span>
            <span data-field="program">Master of IT</span>
            <table class="documents">
              <tr><td>Passport Scan.pdf</td><td><a class="download-link" href="/download/1">View</a></td></tr>
              <tr><td>IELTS Certificate.pdf</td><td></td></tr>
              <tr><td>Random Unrelated File.pdf</td><td></td></tr>
            </table>
          </body>
        </html>
    "#;

    #[test]
    fn parses_fields_and_classifies_documents() {
        let detail = parse_student_detail_html(FIXTURE_HTML, "42").unwrap();
        assert_eq!(detail.id, "42");
        assert_eq!(detail.name, "Jane Doe");
        assert_eq!(detail.branch, "Access Kathmandu");
        assert_eq!(detail.country, "Nepal");
        assert_eq!(detail.university, "University of Melbourne");
        assert_eq!(detail.program, "Master of IT");

        let passport = detail.documents.iter().find(|d| d.label == "Passport").unwrap();
        assert!(passport.present);

        let english = detail
            .documents
            .iter()
            .find(|d| d.label == "English Score")
            .unwrap();
        assert!(!english.present);

        // "Random Unrelated File.pdf" matches no keyword and is dropped, not surfaced.
        assert_eq!(detail.documents.len(), 2);
    }

    #[test]
    fn degrades_gracefully_when_selectors_match_nothing() {
        let detail = parse_student_detail_html("<html><body>Nothing here.</body></html>", "7").unwrap();
        assert_eq!(detail.id, "7");
        assert_eq!(detail.name, "");
        assert!(detail.documents.is_empty());
    }

    #[test]
    fn dedupes_multiple_rows_matching_same_category() {
        let html = r#"
            <table class="documents">
              <tr><td>Transcript Part 1.pdf</td><td></td></tr>
              <tr><td>Transcript Part 2.pdf</td><td><a class="download-link">View</a></td></tr>
            </table>
        "#;
        let detail = parse_student_detail_html(html, "1").unwrap();
        assert_eq!(detail.documents.len(), 1);
        assert_eq!(detail.documents[0].label, "Academic Transcripts");
        // present becomes true because at least one matching row indicated present.
        assert!(detail.documents[0].present);
    }
}
