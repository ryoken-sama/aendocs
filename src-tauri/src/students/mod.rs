mod detail_parser;
mod filter_options_parser;
mod search_parser;

pub use detail_parser::StudentDetail;
pub use filter_options_parser::FilterOptions;
pub use search_parser::{StudentSearchResult, StudentSummary};

use crate::app_state::AppState;
use crate::auth;
use crate::errors::AppError;
use serde_json::Value;
use tauri::AppHandle;

const STUDENTS_URL: &str = "https://aenapply.com/offerapplications";
const STUDENT_DETAIL_URL_BASE: &str = "https://aenapply.com/offerapplications/show";

/// Server-side filters supported by the `/offerapplications` DataTables
/// endpoint via `queryStrings[n][name]`/`queryStrings[n][value]` pairs — each
/// select's underlying database ID, not its display name. Empty string means
/// "no filter" for that field.
pub struct SearchFilters<'a> {
    pub branch_id: &'a str,
    pub agent_id: &'a str,
    pub country_id: &'a str,
    pub institution_id: &'a str,
}

pub async fn search_students(
    app: &AppHandle,
    state: &AppState,
    query: &str,
    start: u32,
    length: u32,
    filters: &SearchFilters<'_>,
) -> Result<StudentSearchResult, AppError> {
    auth::ensure_logged_in(app, state).await?;

    let mut params: Vec<(String, String)> = vec![
        ("draw".to_string(), "1".to_string()),
        ("start".to_string(), start.to_string()),
        ("length".to_string(), length.to_string()),
        ("search[value]".to_string(), query.to_string()),
    ];

    // Field name here is exactly the filtered <select>'s `name` attribute on
    // the /offerapplications page (see filter_options_parser.rs) — the
    // country_id param name is assumed to follow the same pattern as the
    // other three since it wasn't independently confirmed against a live
    // request; if filtering by country doesn't actually narrow results,
    // this is the first place to check.
    let id_filters: [(&str, &str); 4] = [
        ("branch_id", filters.branch_id),
        ("agent_id", filters.agent_id),
        ("country_id", filters.country_id),
        ("institution_id", filters.institution_id),
    ];
    let mut n = 0;
    for (field_name, value) in id_filters {
        if value.is_empty() {
            continue;
        }
        params.push((format!("queryStrings[{n}][name]"), field_name.to_string()));
        params.push((format!("queryStrings[{n}][value]"), value.to_string()));
        n += 1;
    }

    let response = state
        .http_client
        .get(STUDENTS_URL)
        .header("X-Requested-With", "XMLHttpRequest")
        .query(&params)
        .send()
        .await?;

    let raw: Value = response.json().await?;
    search_parser::parse_datatables_response(&raw)
}

pub async fn get_student_detail(
    app: &AppHandle,
    state: &AppState,
    student_id: &str,
) -> Result<StudentDetail, AppError> {
    auth::ensure_logged_in(app, state).await?;

    let url = format!("{STUDENT_DETAIL_URL_BASE}/{student_id}");
    let html = state.http_client.get(&url).send().await?.text().await?;
    detail_parser::parse_student_detail_html(&html)
}

/// Fetches the plain (non-AJAX) `/offerapplications` page and parses its
/// filter dropdowns (Branch, Agent, Country, Institution) into id -> name
/// mappings for the search screen's server-side filter comboboxes.
pub async fn get_filter_options(app: &AppHandle, state: &AppState) -> Result<FilterOptions, AppError> {
    auth::ensure_logged_in(app, state).await?;

    let html = state.http_client.get(STUDENTS_URL).send().await?.text().await?;
    Ok(filter_options_parser::parse_filter_options_html(&html))
}
