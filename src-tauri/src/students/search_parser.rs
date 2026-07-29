use super::html_util::decode_and_strip_tags;
use crate::errors::AppError;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentSummary {
    /// The `offerapplication_id` — used for `/offerapplications/show/{id}`
    /// and `/offerapplications/make-zip/{id}`.
    pub id: String,
    /// The numeric ID from the student profile link (`/students/show/{id}`),
    /// distinct from `id` above.
    #[serde(default)]
    pub students_id: String,
    /// The human-readable application code, e.g. "A40095".
    #[serde(default)]
    pub application_id: String,
    pub name: String,
    pub branch: String,
    pub country: String,
    pub university: String,
    pub program: String,
    /// Plain-text progress status (e.g. "Document Submitted"), decoded from
    /// the HTML-encoded `<span>` markup aenapply.com sends in
    /// `progress_status_name`.
    #[serde(default)]
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct StudentSearchResult {
    pub records_total: u32,
    pub records_filtered: u32,
    pub students: Vec<StudentSummary>,
}

fn value_to_string(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Null => String::new(),
        other => other.to_string(),
    }
}

/// Parses the `student` field's raw HTML, e.g.
/// `<a class='mb-0 link link-primary' href='https://aenapply.com/students/show/4384'>Supriya Sapkota Paudel</a>
/// <p class='mb-0'>Associate: Access Pokhara</p>`
/// into (name, numeric id from the href, branch).
fn parse_student_fields(html: &str) -> (String, String, String) {
    let fragment = Html::parse_fragment(html);
    let mut name = String::new();
    let mut students_id = String::new();
    let mut branch = String::new();

    if let Ok(a_selector) = Selector::parse("a") {
        if let Some(anchor) = fragment.select(&a_selector).next() {
            name = anchor.text().collect::<String>().trim().to_string();
            students_id = anchor
                .value()
                .attr("href")
                .and_then(|href| href.rsplit('/').next())
                .unwrap_or_default()
                .to_string();
        }
    }

    if let Ok(p_selector) = Selector::parse("p") {
        for p in fragment.select(&p_selector) {
            let text = p.text().collect::<String>();
            if let Some(value) = text.trim_start().strip_prefix("Associate:") {
                branch = value.trim().to_string();
            }
        }
    }

    (name, students_id, branch)
}

/// Parses the `program` field's raw HTML, e.g.
/// `<p class='mb-1'>Country: New Zealand</p>
/// <p class='mb-1'>Institution: Western Institute of Technology(WITT)</p>
/// <p class='mb-1'>Program: <a href='...'>Bachelor of Nursing</a></p>`
/// into (country, university, program). `program` is taken from the inner
/// text of the `<a>` tag inside the "Program:" paragraph, not the
/// paragraph's own text.
fn parse_program_fields(html: &str) -> (String, String, String) {
    let fragment = Html::parse_fragment(html);
    let mut country = String::new();
    let mut university = String::new();
    let mut program = String::new();

    let (Ok(p_selector), Ok(a_selector)) = (Selector::parse("p"), Selector::parse("a")) else {
        return (country, university, program);
    };

    for p in fragment.select(&p_selector) {
        let text = p.text().collect::<String>();
        let trimmed = text.trim_start();
        if let Some(value) = trimmed.strip_prefix("Country:") {
            country = value.trim().to_string();
        } else if let Some(value) = trimmed.strip_prefix("Institution:") {
            university = value.trim().to_string();
        } else if trimmed.starts_with("Program:") {
            if let Some(anchor) = p.select(&a_selector).next() {
                program = anchor.text().collect::<String>().trim().to_string();
            }
        }
    }

    (country, university, program)
}

/// Parses one aenapply.com `/offerapplications` DataTables row. `pub(crate)`
/// so the dashboard's "Recent Applications" fetch (a different request
/// shape — extra `updated_at` column/sort — but the same row structure) can
/// reuse it instead of duplicating the HTML parsing.
pub(crate) fn parse_row(row: &Value) -> StudentSummary {
    let student_html = row.get("student").and_then(Value::as_str).unwrap_or_default();
    let program_html = row.get("program").and_then(Value::as_str).unwrap_or_default();
    let application_id = row
        .get("application_id")
        .map(value_to_string)
        .unwrap_or_default();
    let offerapplication_id = row
        .get("offerapplication_id")
        .map(value_to_string)
        .unwrap_or_default();
    // `progress_status_name` is confirmed for /offerapplications; the other
    // 6 sidebar sections request a `status` column instead (see
    // Section::columns) and haven't been checked against a live response,
    // so fall back to whichever key is actually present.
    let status = row
        .get("progress_status_name")
        .or_else(|| row.get("status"))
        .and_then(Value::as_str)
        .map(decode_and_strip_tags)
        .unwrap_or_default();

    let (name, students_id, branch) = parse_student_fields(student_html);
    let (country, university, program) = parse_program_fields(program_html);

    StudentSummary {
        id: offerapplication_id,
        students_id,
        application_id,
        name,
        branch,
        country,
        university,
        program,
        status,
    }
}

/// Parses the aenapply.com `/offerapplications` DataTables JSON response
/// (`recordsTotal`/`recordsFiltered`/`data[]`), where each row carries raw
/// HTML fragments in the `student` and `program` fields.
pub fn parse_datatables_response(raw: &Value) -> Result<StudentSearchResult, AppError> {
    let records_total = raw.get("recordsTotal").and_then(Value::as_u64).unwrap_or(0) as u32;
    let records_filtered = raw.get("recordsFiltered").and_then(Value::as_u64).unwrap_or(0) as u32;
    let data = raw
        .get("data")
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::Other("DataTables response missing 'data' array".to_string()))?;

    let students: Vec<StudentSummary> = data.iter().map(parse_row).collect();

    Ok(StudentSearchResult {
        records_total,
        records_filtered,
        students,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const ENCODED_STATUS: &str =
        "&lt;span class=&quot;fw-meduim text-info&quot;&gt;Document Submitted&lt;/span&gt;";

    fn sample_row() -> Value {
        json!({
            "application_id": "A40095",
            "offerapplication_id": 5365,
            "progress_status_name": ENCODED_STATUS,
            "student": "<a class='mb-0 link link-primary' href='https://aenapply.com/students/show/4384'>Supriya Sapkota Paudel</a>\n<p class='mb-0'>Phone: +9779843650899</p>\n<p class='mb-0'>Email: supriya@example.com</p>\n<p class='mb-0'>Associate: Access Pokhara</p>",
            "program": "\n<p class='mb-1'>Country: New Zealand</p>\n<p class='mb-1'>Institution: Western Institute of Technology(WITT)</p>\n<p class='mb-1'>Campus/College: New Plymouth</p>\n<p class='mb-1'>Program: <a href='https://aenapply.com/programs/show/2746'>Bachelor of Nursing</a></p>"
        })
    }

    #[test]
    fn parses_confirmed_real_shape() {
        let raw = json!({
            "recordsTotal": 1,
            "recordsFiltered": 1,
            "data": [sample_row()]
        });
        let result = parse_datatables_response(&raw).unwrap();
        assert_eq!(result.students.len(), 1);

        let student = &result.students[0];
        assert_eq!(student.id, "5365");
        assert_eq!(student.application_id, "A40095");
        assert_eq!(student.name, "Supriya Sapkota Paudel");
        assert_eq!(student.students_id, "4384");
        assert_eq!(student.branch, "Access Pokhara");
        assert_eq!(student.country, "New Zealand");
        assert_eq!(student.university, "Western Institute of Technology(WITT)");
        assert_eq!(student.program, "Bachelor of Nursing");
        assert_eq!(student.status, "Document Submitted");
    }

    #[test]
    fn does_not_filter_rows_by_status() {
        let mut pending = sample_row();
        pending["progress_status_name"] = json!(
            "&lt;span class=&quot;fw-meduim text-warning&quot;&gt;Document Pending&lt;/span&gt;"
        );
        let raw = json!({
            "recordsTotal": 2,
            "recordsFiltered": 2,
            "data": [pending, sample_row()]
        });
        let result = parse_datatables_response(&raw).unwrap();
        assert_eq!(result.students.len(), 2);
        assert_eq!(result.students[0].status, "Document Pending");
        assert_eq!(result.students[1].status, "Document Submitted");
    }

    #[test]
    fn program_value_is_the_anchor_text_not_the_whole_paragraph() {
        let (_, _, program) = parse_program_fields(
            "<p class='mb-1'>Program: <a href='https://aenapply.com/programs/show/1'>Bachelor of IT</a></p>",
        );
        assert_eq!(program, "Bachelor of IT");
    }

    #[test]
    fn errors_when_data_field_missing() {
        let raw = json!({ "recordsTotal": 0, "recordsFiltered": 0 });
        assert!(parse_datatables_response(&raw).is_err());
    }

    // Verbatim strings from the latest bug report, to settle definitively
    // whether the selector logic itself is at fault.
    #[test]
    fn parses_verbatim_student_html_from_bug_report() {
        let html = "<a class='mb-0 link link-primary' href='https://aenapply.com/students/show/4384'>Supriya Sapkota Paudel</a>\n<p class='mb-0'>Phone: 9867970375</p>\n<p class='mb-0'>Email: supriyapaudel22@gmail.com</p>\n<p class='mb-0'>Associate: Access Pokhara</p>";
        let (name, students_id, branch) = parse_student_fields(html);
        assert_eq!(name, "Supriya Sapkota Paudel");
        assert_eq!(students_id, "4384");
        assert_eq!(branch, "Access Pokhara");
    }

    #[test]
    fn parses_verbatim_program_html_from_bug_report() {
        let html = "<p class='mb-1'>Country: New Zealand</p>\n<p class='mb-1'>Institution: Victoria University of Wellington</p>\n<p class='mb-1'>Campus/College: Pipitea Campus</p>\n<p class='mb-1'>Program: <a href='https://aenapply.com/programs/show/1'>Master of Public Policy</a></p>";
        let (country, university, program) = parse_program_fields(html);
        assert_eq!(country, "New Zealand");
        assert_eq!(university, "Victoria University of Wellington");
        assert_eq!(program, "Master of Public Policy");
    }
}
