mod applications_link_parser;
mod detail_parser;
mod filter_options_parser;
mod html_util;
mod list_parser;
mod search_parser;
mod section;

pub use applications_link_parser::StudentApplicationLink;
pub use detail_parser::StudentDetail;
pub use filter_options_parser::FilterOptions;
pub use list_parser::StudentListResult;
pub use search_parser::{StudentSearchResult, StudentSummary};
pub use section::Section;

use crate::app_state::AppState;
use crate::auth;
use crate::config;
use crate::errors::AppError;
use serde_json::Value;
use std::path::PathBuf;
use tauri::AppHandle;

const STUDENTS_URL: &str = "https://aenapply.com/offerapplications";
const STUDENT_DETAIL_URL_BASE: &str = "https://aenapply.com/offerapplications/show";
const FILTER_OPTIONS_CACHE_FILE: &str = "filter_options_cache.json";
const STUDENTS_LIST_URL: &str = "https://aenapply.com/students";
const STUDENT_PROFILE_URL_BASE: &str = "https://aenapply.com/students/show";

/// The exact `columns[]` the `/students` DataTables endpoint expects, in
/// order — `DT_RowIndex` is column 0, matching the fixed `order[0]` below.
const STUDENTS_LIST_COLUMNS: &[&str] = &[
    "DT_RowIndex",
    "created_at",
    "name",
    "email",
    "mobile",
    "countries_id",
    "counselor_assigned",
    "associate",
    "visa",
    "action",
];

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
    section: Section,
    filters: &SearchFilters<'_>,
) -> Result<StudentSearchResult, AppError> {
    auth::ensure_logged_in(app, state).await?;

    let mut params: Vec<(String, String)> = vec![
        ("draw".to_string(), "1".to_string()),
        ("start".to_string(), start.to_string()),
        ("length".to_string(), length.to_string()),
        ("search[value]".to_string(), query.to_string()),
    ];

    // Each of the 7 sidebar views is backed by a differently-shaped
    // DataTables table server-side, so the `columns[]` sent must match
    // exactly what that view expects (see Section::columns). `student` is
    // always column 0, matching the fixed order[0] below.
    for (i, column) in section.columns().iter().enumerate() {
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
    params.push(("order[0][column]".to_string(), "0".to_string()));
    params.push(("order[0][dir]".to_string(), "asc".to_string()));
    params.push(("order[0][name]".to_string(), "student".to_string()));

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

    // aenapply's DataTables endpoints only support GET here — a POST with
    // the same form-encoded body comes back 200 but without a `data` array,
    // so despite the large query string this has to stay GET.
    let response = state
        .http_client
        .get(section.url())
        .header("X-Requested-With", "XMLHttpRequest")
        .query(&params)
        .send()
        .await?;

    let raw: Value = response.json().await?;
    search_parser::parse_datatables_response(&raw)
}

/// Server-side filters for the `/students` DataTables endpoint — sent the
/// same way as `/offerapplications*`'s `SearchFilters`, via
/// `queryStrings[n][name]`/`queryStrings[n][value]` pairs, not as plain
/// query params.
pub struct StudentsListFilter<'a> {
    pub branch_id: &'a str,
    pub agent_id: &'a str,
    pub country_id: &'a str,
}

pub async fn search_students_list(
    app: &AppHandle,
    state: &AppState,
    query: &str,
    start: u32,
    length: u32,
    filter: &StudentsListFilter<'_>,
) -> Result<StudentListResult, AppError> {
    auth::ensure_logged_in(app, state).await?;

    let mut params: Vec<(String, String)> = vec![
        ("draw".to_string(), "1".to_string()),
        ("start".to_string(), start.to_string()),
        ("length".to_string(), length.to_string()),
        ("search[value]".to_string(), query.to_string()),
    ];

    for (i, column) in STUDENTS_LIST_COLUMNS.iter().enumerate() {
        let orderable_and_searchable = *column != "action" && *column != "DT_RowIndex" && *column != "visa";
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
    params.push(("order[0][column]".to_string(), "0".to_string()));
    params.push(("order[0][dir]".to_string(), "asc".to_string()));
    params.push(("order[0][name]".to_string(), "DT_RowIndex".to_string()));

    // queryStrings[n][name]/queryStrings[n][value] pairs, same as
    // /offerapplications* — see StudentsListFilter.
    let id_filters: [(&str, &str); 3] = [
        ("branch_id", filter.branch_id),
        ("agent_id", filter.agent_id),
        ("country_id", filter.country_id),
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
        .get(STUDENTS_LIST_URL)
        .header("X-Requested-With", "XMLHttpRequest")
        .query(&params)
        .send()
        .await?;

    let raw: Value = response.json().await?;
    list_parser::parse_students_list_response(&raw)
}

/// Best-effort fetch of a student's individual application links from their
/// `/students/show/{id}` profile page — see applications_link_parser.rs for
/// the "unverified" caveat.
pub async fn get_student_applications(
    app: &AppHandle,
    state: &AppState,
    students_id: &str,
) -> Result<Vec<StudentApplicationLink>, AppError> {
    auth::ensure_logged_in(app, state).await?;

    let url = format!("{STUDENT_PROFILE_URL_BASE}/{students_id}");
    let html = state.http_client.get(&url).send().await?.text().await?;
    Ok(applications_link_parser::parse_student_applications_html(&html))
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

fn filter_options_cache_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(config::app_data_dir(app)?.join(FILTER_OPTIONS_CACHE_FILE))
}

/// Fetches the plain (non-AJAX) `/offerapplications` page and parses its
/// filter dropdowns (Branch, Agent, Country, Institution) into id -> name
/// mappings for the search screen's server-side filter comboboxes.
///
/// These lists rarely change, so — unlike student records, which are never
/// cached — they're read from a disk cache when one exists, skipping the
/// live fetch entirely. A fresh install (or a deleted cache file) falls
/// back to fetching and parsing the page live, then writes the result for
/// next time.
pub async fn get_filter_options(app: &AppHandle, state: &AppState) -> Result<FilterOptions, AppError> {
    let cache_path = filter_options_cache_path(app)?;
    if let Ok(raw) = std::fs::read_to_string(&cache_path) {
        if let Ok(cached) = serde_json::from_str::<FilterOptions>(&raw) {
            return Ok(cached);
        }
    }

    auth::ensure_logged_in(app, state).await?;

    let html = state.http_client.get(STUDENTS_URL).send().await?.text().await?;
    let options = filter_options_parser::parse_filter_options_html(&html);

    if let Ok(raw) = serde_json::to_string_pretty(&options) {
        let _ = std::fs::write(&cache_path, raw);
    }

    Ok(options)
}
