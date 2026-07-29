use scraper::{Html, Selector};
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct StudentApplicationLink {
    /// The `offerapplication_id`, usable with the existing
    /// `/offerapplications/show/{id}` detail fetch.
    pub id: String,
    /// The link's own text — whatever aenapply renders there (often just
    /// the program name). May be empty if the anchor has no text.
    pub label: String,
}

/// Best-effort scrape of a student's `/students/show/{id}` profile page for
/// links to their individual offer applications.
///
/// UNVERIFIED: unlike the other parsers in this module, this one hasn't
/// been checked against real `/students/show/{id}` HTML — there was no
/// sample available. Rather than guess specific wrapper classes (which
/// would silently break if wrong), it matches purely on the URL pattern
/// `/offerapplications/show/{id}` wherever it appears on the page, which is
/// the one thing we're actually confident about (the same base URL already
/// used by `get_student_detail`). Verify against a real page and tighten
/// the selector if this pulls in unrelated links or misses real ones.
pub fn parse_student_applications_html(html: &str) -> Vec<StudentApplicationLink> {
    let document = Html::parse_document(html);
    let Ok(selector) = Selector::parse("a[href*='/offerapplications/show/']") else {
        return Vec::new();
    };

    let mut seen = std::collections::HashSet::new();
    document
        .select(&selector)
        .filter_map(|anchor| {
            let href = anchor.value().attr("href")?;
            let id = href.rsplit('/').next()?.trim();
            if id.is_empty() || !seen.insert(id.to_string()) {
                return None;
            }
            let label = anchor.text().collect::<String>().trim().to_string();
            Some(StudentApplicationLink {
                id: id.to_string(),
                label,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_application_links() {
        let html = r#"
            <div class="applications">
              <a href="https://aenapply.com/offerapplications/show/5365">Bachelor of Nursing</a>
              <a href="https://aenapply.com/offerapplications/show/5400">Master of IT</a>
            </div>
        "#;
        let links = parse_student_applications_html(html);
        assert_eq!(
            links,
            vec![
                StudentApplicationLink {
                    id: "5365".to_string(),
                    label: "Bachelor of Nursing".to_string()
                },
                StudentApplicationLink {
                    id: "5400".to_string(),
                    label: "Master of IT".to_string()
                },
            ]
        );
    }

    #[test]
    fn deduplicates_repeated_links() {
        let html = r#"
            <a href="https://aenapply.com/offerapplications/show/5365">Bachelor of Nursing</a>
            <a href="https://aenapply.com/offerapplications/show/5365">View</a>
        "#;
        let links = parse_student_applications_html(html);
        assert_eq!(links.len(), 1);
        assert_eq!(links[0].label, "Bachelor of Nursing");
    }

    #[test]
    fn ignores_unrelated_links() {
        let html = r#"<a href="https://aenapply.com/students/show/4384">Profile</a>"#;
        assert!(parse_student_applications_html(html).is_empty());
    }

    #[test]
    fn degrades_gracefully_when_nothing_matches() {
        assert!(parse_student_applications_html("<div>Nothing here.</div>").is_empty());
    }
}
