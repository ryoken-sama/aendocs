mod detail_parser;
mod search_parser;

pub use detail_parser::StudentDetail;
pub use search_parser::{StudentSearchResult, StudentSummary};

use crate::app_state::AppState;
use crate::auth;
use crate::errors::AppError;
use serde_json::Value;
use tauri::AppHandle;

const STUDENTS_URL: &str = "https://aenapply.com/students";
const STUDENT_DETAIL_URL_BASE: &str = "https://aenapply.com/offerapplications/show";

pub async fn search_students(
    app: &AppHandle,
    state: &AppState,
    query: &str,
    start: u32,
    length: u32,
) -> Result<StudentSearchResult, AppError> {
    auth::ensure_logged_in(app, state).await?;

    let params = [
        ("draw", "1".to_string()),
        ("start", start.to_string()),
        ("length", length.to_string()),
        ("search[value]", query.to_string()),
    ];

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
    detail_parser::parse_student_detail_html(&html, student_id)
}
