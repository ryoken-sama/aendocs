use super::search_parser::{self, StudentSummary};
use super::section::Section;
use crate::app_state::AppState;
use crate::auth;
use crate::errors::AppError;
use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
pub struct RecentApplication {
    pub student: StudentSummary,
    pub updated_at: String,
}

/// Fetches the most recently updated applications for the dashboard's
/// "Recent Applications" panel — or, when the caller passes `Section::
/// Granted` instead, the same shape of query against `/offerapplications/
/// granted` for the "Recent Visa Grants" fallback shown when the account
/// can't see `Section::Applications` at all (see DashboardScreen).
///
/// UNVERIFIED: aenapply's own UI has no equivalent "recent across all
/// statuses, newest first" view, so there's no confirmed request shape to
/// copy. This appends `updated_at` as an extra requested column after the
/// section's normal set and points `order[0]` at it — if the server
/// doesn't honor that, the panel still renders real rows, just not
/// necessarily in recency order.
pub async fn get_recent_applications(
    state: &AppState,
    section: Section,
    length: u32,
) -> Result<Vec<RecentApplication>, AppError> {
    auth::ensure_logged_in(state).await?;

    let mut columns: Vec<&str> = section.columns().to_vec();
    columns.push("updated_at");
    let sort_index = columns.len() - 1;

    let mut params: Vec<(String, String)> = vec![
        ("draw".to_string(), "1".to_string()),
        ("start".to_string(), "0".to_string()),
        ("length".to_string(), length.to_string()),
        ("search[value]".to_string(), String::new()),
    ];

    for (i, column) in columns.iter().enumerate() {
        let orderable_and_searchable = *column != "action";
        params.push((format!("columns[{i}][data]"), column.to_string()));
        params.push((format!("columns[{i}][name]"), column.to_string()));
        params.push((
            format!("columns[{i}][searchable]"),
            orderable_and_searchable.to_string(),
        ));
        params.push((
            format!("columns[{i}][orderable]"),
            orderable_and_searchable.to_string(),
        ));
        params.push((format!("columns[{i}][search][value]"), String::new()));
        params.push((format!("columns[{i}][search][regex]"), "false".to_string()));
    }
    params.push(("order[0][column]".to_string(), sort_index.to_string()));
    params.push(("order[0][dir]".to_string(), "desc".to_string()));
    params.push(("order[0][name]".to_string(), "updated_at".to_string()));

    let raw = super::datatables_client::fetch_datatables_json(state, &section.url(), &params).await?;
    let data = raw
        .get("data")
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::Other("DataTables response missing 'data' array".to_string()))?;

    Ok(data
        .iter()
        .map(|row| {
            let student = search_parser::parse_row(row);
            let updated_at = row
                .get("updated_at")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string();
            RecentApplication { student, updated_at }
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_student_and_updated_at_from_each_row() {
        let row = json!({
            "application_id": "A1",
            "offerapplication_id": 1,
            "progress_status_name": "Document Submitted",
            "student": "<a href='https://aenapply.com/students/show/4384'>Jane Doe</a>",
            "program": "<p class='mb-1'>Country: New Zealand</p>",
            "updated_at": "2026-07-28 10:30:00",
        });
        let raw = json!({ "recordsTotal": 1, "recordsFiltered": 1, "data": [row] });
        let data = raw.get("data").and_then(Value::as_array).unwrap();
        let recent: Vec<RecentApplication> = data
            .iter()
            .map(|r| RecentApplication {
                student: search_parser::parse_row(r),
                updated_at: r.get("updated_at").and_then(Value::as_str).unwrap_or_default().to_string(),
            })
            .collect();
        assert_eq!(recent[0].student.name, "Jane Doe");
        assert_eq!(recent[0].updated_at, "2026-07-28 10:30:00");
    }
}
