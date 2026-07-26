use crate::errors::AppError;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentSummary {
    pub id: String,
    pub name: String,
    pub branch: String,
    pub country: String,
    pub university: String,
    pub program: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct StudentSearchResult {
    pub records_total: u32,
    pub records_filtered: u32,
    pub students: Vec<StudentSummary>,
}

/// Column order/keys for the DataTables response — this is the one place to
/// edit once a real response has been captured (see plan §6a). Each row may
/// arrive as either a named object or a positional array; both are handled.
const FIELD_NAMES: [&str; 6] = ["id", "name", "branch", "country", "university", "program"];

fn value_to_string(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Null => String::new(),
        other => other.to_string(),
    }
}

fn extract_field(row: &Value, key: &str, index: usize) -> String {
    match row {
        Value::Object(_) => row.get(key).map(value_to_string).unwrap_or_default(),
        Value::Array(arr) => arr.get(index).map(value_to_string).unwrap_or_default(),
        _ => String::new(),
    }
}

fn parse_row(row: &Value) -> StudentSummary {
    StudentSummary {
        id: extract_field(row, FIELD_NAMES[0], 0),
        name: extract_field(row, FIELD_NAMES[1], 1),
        branch: extract_field(row, FIELD_NAMES[2], 2),
        country: extract_field(row, FIELD_NAMES[3], 3),
        university: extract_field(row, FIELD_NAMES[4], 4),
        program: extract_field(row, FIELD_NAMES[5], 5),
    }
}

/// Parses a standard `yajra/laravel-datatables`-shaped JSON response
/// (`draw`/`recordsTotal`/`recordsFiltered`/`data[]`). This is the first
/// guess at the real shape and must be validated against a live captured
/// response before relying on it in production (see plan §10).
pub fn parse_datatables_response(raw: &Value) -> Result<StudentSearchResult, AppError> {
    let records_total = raw.get("recordsTotal").and_then(Value::as_u64).unwrap_or(0) as u32;
    let records_filtered = raw.get("recordsFiltered").and_then(Value::as_u64).unwrap_or(0) as u32;
    let data = raw
        .get("data")
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::Other("DataTables response missing 'data' array".to_string()))?;

    let students = data.iter().map(parse_row).collect();

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

    #[test]
    fn parses_object_shaped_rows() {
        let raw = json!({
            "draw": 1,
            "recordsTotal": 100,
            "recordsFiltered": 1,
            "data": [
                {
                    "id": "42",
                    "name": "Jane Doe",
                    "branch": "Access Kathmandu",
                    "country": "Nepal",
                    "university": "University of Melbourne",
                    "program": "Master of IT"
                }
            ]
        });
        let result = parse_datatables_response(&raw).unwrap();
        assert_eq!(result.records_total, 100);
        assert_eq!(result.records_filtered, 1);
        assert_eq!(result.students.len(), 1);
        assert_eq!(result.students[0].id, "42");
        assert_eq!(result.students[0].name, "Jane Doe");
        assert_eq!(result.students[0].branch, "Access Kathmandu");
    }

    #[test]
    fn parses_array_shaped_rows_positionally() {
        let raw = json!({
            "draw": 1,
            "recordsTotal": 5,
            "recordsFiltered": 5,
            "data": [
                ["7", "John Smith", "Access Pokhara", "Nepal", "Monash University", "Bachelor of Business"]
            ]
        });
        let result = parse_datatables_response(&raw).unwrap();
        assert_eq!(result.students.len(), 1);
        assert_eq!(result.students[0].id, "7");
        assert_eq!(result.students[0].name, "John Smith");
        assert_eq!(result.students[0].university, "Monash University");
    }

    #[test]
    fn tolerates_numeric_id() {
        let raw = json!({
            "recordsTotal": 1,
            "recordsFiltered": 1,
            "data": [{ "id": 42, "name": "Jane Doe", "branch": "", "country": "", "university": "", "program": "" }]
        });
        let result = parse_datatables_response(&raw).unwrap();
        assert_eq!(result.students[0].id, "42");
    }

    #[test]
    fn errors_when_data_field_missing() {
        let raw = json!({ "recordsTotal": 0, "recordsFiltered": 0 });
        assert!(parse_datatables_response(&raw).is_err());
    }
}
