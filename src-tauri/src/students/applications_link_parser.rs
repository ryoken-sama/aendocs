use scraper::{ElementRef, Html, Selector};
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq, Default)]
pub struct StudentApplicationLink {
    /// The `offerapplication_id`, from the "Application Profile" button's
    /// href — usable with the existing `/offerapplications/show/{id}`
    /// detail fetch.
    pub id: String,
    /// e.g. "A65340".
    pub application_id: String,
    /// e.g. "07 Jul, 2024" — the Application cell's second line, verbatim.
    pub date: String,
    pub country: String,
    pub university: String,
    pub program: String,
    pub status: String,
}

fn cell_text(cell: &ElementRef) -> String {
    cell.text().collect::<String>().trim().to_string()
}

/// The Application cell holds both the application id (in an `<a>`) and,
/// per the confirmed column layout, a date as "the second line" — taken
/// here as the first two non-empty text fragments in document order. That
/// holds regardless of whether the date is a trailing text node after a
/// `<br>`, or wrapped in its own `<span>`/`<p>`, since `ElementRef::text()`
/// yields one string per text node in document order either way.
fn application_cell_parts(cell: &ElementRef) -> (String, String) {
    let mut parts = cell.text().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let application_id = parts.next().unwrap_or_default();
    let date = parts.next().unwrap_or_default();
    (application_id, date)
}

/// Best-effort scrape of a student's `/students/show/{id}` profile page's
/// applications table into structured rows.
///
/// UNVERIFIED: built from the confirmed column layout (S.N, Application
/// [id + date], Country, University, Program, Status, Action) and a couple
/// of example values, not a raw HTML sample of the real page. This selects
/// every `<tr>` containing a link to `/offerapplications/show/{id}` (the
/// Action column's "Application Profile" button — the one thing previously
/// confirmed, from the earlier "Application Profile" x2 bug where the old
/// generic-anchor selector picked up only that button) and reads its
/// sibling `<td>` cells by position in that stated column order. If the
/// real table's structure differs (e.g. S.N isn't its own `<td>`, shifting
/// every later index), this is the first place to check.
pub fn parse_student_applications_html(html: &str) -> Vec<StudentApplicationLink> {
    let document = Html::parse_document(html);
    let (Ok(row_selector), Ok(cell_selector), Ok(link_selector)) = (
        Selector::parse("tr"),
        Selector::parse("td"),
        Selector::parse("a[href*='/offerapplications/show/']"),
    ) else {
        return Vec::new();
    };

    let mut seen = std::collections::HashSet::new();
    let mut results = Vec::new();

    for row in document.select(&row_selector) {
        let Some(id) = row
            .select(&link_selector)
            .next()
            .and_then(|a| a.value().attr("href"))
            .and_then(|href| href.rsplit('/').next())
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
        else {
            continue; // not an application row (e.g. a header row)
        };
        if !seen.insert(id.to_string()) {
            continue;
        }

        let cells: Vec<ElementRef> = row.select(&cell_selector).collect();
        let (application_id, date) = cells.get(1).map(application_cell_parts).unwrap_or_default();

        results.push(StudentApplicationLink {
            id: id.to_string(),
            application_id,
            date,
            country: cells.get(2).map(cell_text).unwrap_or_default(),
            university: cells.get(3).map(cell_text).unwrap_or_default(),
            program: cells.get(4).map(cell_text).unwrap_or_default(),
            status: cells.get(5).map(cell_text).unwrap_or_default(),
        });
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE_HTML: &str = r#"
        <table>
          <thead>
            <tr><th>S.N</th><th>Application</th><th>Country</th><th>University</th><th>Program</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><a href="/offerapplications/show/5364">A65340</a><br>07 Jul, 2024</td>
              <td>New Zealand</td>
              <td>The University of Waikato</td>
              <td>Bachelor of Nursing</td>
              <td><span class="badge bg-info">Document Submitted</span></td>
              <td><a href="/offerapplications/show/5364" class="btn btn-primary">Application Profile</a></td>
            </tr>
            <tr>
              <td>2</td>
              <td><a href="/offerapplications/show/5400">A65341</a><br>10 Aug, 2024</td>
              <td>Australia</td>
              <td>University of Sydney</td>
              <td>Master of IT</td>
              <td><span class="badge bg-success">Visa Granted</span></td>
              <td><a href="/offerapplications/show/5400" class="btn btn-primary">Application Profile</a></td>
            </tr>
          </tbody>
        </table>
    "#;

    #[test]
    fn parses_all_columns_from_each_row() {
        let apps = parse_student_applications_html(FIXTURE_HTML);
        assert_eq!(apps.len(), 2);

        assert_eq!(apps[0].id, "5364");
        assert_eq!(apps[0].application_id, "A65340");
        assert_eq!(apps[0].date, "07 Jul, 2024");
        assert_eq!(apps[0].country, "New Zealand");
        assert_eq!(apps[0].university, "The University of Waikato");
        assert_eq!(apps[0].program, "Bachelor of Nursing");
        assert_eq!(apps[0].status, "Document Submitted");

        assert_eq!(apps[1].id, "5400");
        assert_eq!(apps[1].application_id, "A65341");
        assert_eq!(apps[1].date, "10 Aug, 2024");
        assert_eq!(apps[1].status, "Visa Granted");
    }

    #[test]
    fn deduplicates_if_the_action_link_appears_twice_in_a_row() {
        let html = r#"<table><tr>
          <td>1</td>
          <td><a href="/offerapplications/show/1">A1</a><br>01 Jan, 2024</td>
          <td>NZ</td><td>Uni</td><td>Prog</td><td>Status</td>
          <td><a href="/offerapplications/show/1">Application Profile</a> <a href="/offerapplications/show/1">Also here</a></td>
        </tr></table>"#;
        let apps = parse_student_applications_html(html);
        assert_eq!(apps.len(), 1);
    }

    #[test]
    fn ignores_rows_without_an_application_profile_link() {
        let html = "<table><tr><th>S.N</th><th>Application</th></tr></table>";
        assert!(parse_student_applications_html(html).is_empty());
    }

    #[test]
    fn degrades_gracefully_when_nothing_matches() {
        assert!(parse_student_applications_html("<div>Nothing here.</div>").is_empty());
    }
}
