use super::html_util::decode_and_strip_tags;
use crate::errors::AppError;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentListEntry {
    /// `student_id` — an integer field in the row JSON, not scraped from
    /// HTML (unlike `students_id` below, which comes from the profile
    /// link's href). Used for `/students/show/{id}`.
    pub id: String,
    pub students_id: String,
    pub name: String,
    pub email: String,
    pub mobile: String,
    pub branch: String,
    pub country: String,
    pub visa_status: String,
    pub counselor: String,
    #[serde(default)]
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct StudentListResult {
    pub records_total: u32,
    pub records_filtered: u32,
    pub students: Vec<StudentListEntry>,
}

fn value_to_string(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Null => String::new(),
        other => other.to_string(),
    }
}

/// Parses the `name` field's raw HTML — an `<a>` linking to
/// `/students/show/{id}` — into (name, id-from-href), the same shape as
/// `/offerapplications`'s `student` field parsing.
fn parse_name_field(html: &str) -> (String, String) {
    let fragment = Html::parse_fragment(html);
    let mut name = String::new();
    let mut students_id = String::new();

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

    (name, students_id)
}

fn text_field(row: &Value, key: &str) -> String {
    row.get(key).and_then(Value::as_str).unwrap_or_default().trim().to_string()
}

/// The `visa` field bundles the status badge together with an unrelated
/// second line (the university name), e.g.
/// `<p class='mb-1 badge bg-success'>Visa Granted</p>
///  <p class='mb-1'>The University of Waikato</p>`
/// — only the badge's own text is the actual visa status, so this targets
/// the badge-classed element specifically rather than stripping tags from
/// the whole blob (which would concatenate both lines together). Falls
/// back to plain tag-stripping if no badge-classed element is found, so a
/// differently-shaped value still shows something instead of going blank.
fn parse_visa_status(raw: &str) -> String {
    let fragment = Html::parse_fragment(raw);
    if let Ok(badge_selector) = Selector::parse("[class*='badge']") {
        if let Some(badge) = fragment.select(&badge_selector).next() {
            return badge.text().collect::<String>().trim().to_string();
        }
    }
    fragment.root_element().text().collect::<String>().trim().to_string()
}

/// Parses one aenapply.com `/students` DataTables row.
fn parse_row(row: &Value) -> StudentListEntry {
    let id = row.get("student_id").map(value_to_string).unwrap_or_default();
    let name_html = row.get("name").and_then(Value::as_str).unwrap_or_default();
    let (name, students_id) = parse_name_field(name_html);

    let status = row
        .get("status_name")
        .and_then(Value::as_str)
        .map(decode_and_strip_tags)
        .unwrap_or_default();

    StudentListEntry {
        id,
        students_id,
        name,
        email: text_field(row, "email"),
        mobile: text_field(row, "mobile"),
        branch: text_field(row, "associate"),
        country: text_field(row, "countries_id"),
        visa_status: row.get("visa").and_then(Value::as_str).map(parse_visa_status).unwrap_or_default(),
        counselor: text_field(row, "counselor_assigned"),
        status,
    }
}

/// Parses the aenapply.com `/students` DataTables JSON response
/// (`recordsTotal`/`recordsFiltered`/`data[]`).
pub fn parse_students_list_response(raw: &Value) -> Result<StudentListResult, AppError> {
    let records_total = raw.get("recordsTotal").and_then(Value::as_u64).unwrap_or(0) as u32;
    let records_filtered = raw.get("recordsFiltered").and_then(Value::as_u64).unwrap_or(0) as u32;
    let data = raw
        .get("data")
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::Other("DataTables response missing 'data' array".to_string()))?;

    let students: Vec<StudentListEntry> = data.iter().map(parse_row).collect();

    Ok(StudentListResult {
        records_total,
        records_filtered,
        students,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn sample_row() -> Value {
        json!({
            "student_id": 4384,
            "name": "<a href='https://aenapply.com/students/show/4384'>Supriya Sapkota Paudel</a>",
            "email": "supriya@example.com",
            "mobile": "+9779843650899",
            "associate": "Access Pokhara",
            "countries_id": "New Zealand",
            "counselor_assigned": "Ramesh Gurung",
            "visa": "Not Applied",
            "status_name": "&lt;span class=&quot;fw-meduim text-info&quot;&gt;Active&lt;/span&gt;"
        })
    }

    #[test]
    fn parses_a_row() {
        let raw = json!({
            "recordsTotal": 1,
            "recordsFiltered": 1,
            "data": [sample_row()]
        });
        let result = parse_students_list_response(&raw).unwrap();
        assert_eq!(result.students.len(), 1);

        let s = &result.students[0];
        assert_eq!(s.id, "4384");
        assert_eq!(s.students_id, "4384");
        assert_eq!(s.name, "Supriya Sapkota Paudel");
        assert_eq!(s.email, "supriya@example.com");
        assert_eq!(s.mobile, "+9779843650899");
        assert_eq!(s.branch, "Access Pokhara");
        assert_eq!(s.country, "New Zealand");
        assert_eq!(s.visa_status, "Not Applied");
        assert_eq!(s.counselor, "Ramesh Gurung");
        assert_eq!(s.status, "Active");
    }

    #[test]
    fn visa_status_extracts_only_the_badge_text() {
        let mut row = sample_row();
        row["visa"] = json!(
            "<p class='mb-1 badge bg-success'>Visa Granted</p> <p class='mb-1'>The University of Waikato</p>"
        );
        let raw = json!({ "recordsTotal": 1, "recordsFiltered": 1, "data": [row] });
        let result = parse_students_list_response(&raw).unwrap();
        assert_eq!(result.students[0].visa_status, "Visa Granted");
    }

    #[test]
    fn id_comes_from_student_id_field_not_the_href() {
        // student_id (row field) and the href-derived students_id can differ
        // in principle even though they're usually the same underlying ID —
        // id must come from the integer field, never scraped.
        let mut row = sample_row();
        row["student_id"] = json!(9999);
        let raw = json!({ "recordsTotal": 1, "recordsFiltered": 1, "data": [row] });
        let result = parse_students_list_response(&raw).unwrap();
        assert_eq!(result.students[0].id, "9999");
        assert_eq!(result.students[0].students_id, "4384");
    }

    #[test]
    fn errors_when_data_field_missing() {
        let raw = json!({ "recordsTotal": 0, "recordsFiltered": 0 });
        assert!(parse_students_list_response(&raw).is_err());
    }
}
