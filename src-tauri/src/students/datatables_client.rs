use crate::app_state::AppState;
use crate::auth;
use crate::errors::AppError;
use serde_json::Value;

/// Sends one DataTables AJAX GET and, if it succeeds, parses the JSON body.
/// Returns `Ok(None)` (not an error) when aenapply responds with an HTML
/// page instead — the shape of a session-expired redirect — so the caller
/// can decide whether to recover; a genuine network/transport failure still
/// propagates as `Err`.
async fn send_datatables_request(
    state: &AppState,
    url: &str,
    params: &[(String, String)],
) -> Result<Option<Value>, AppError> {
    let response = state
        .http_client()
        .get(url)
        .header("X-Requested-With", "XMLHttpRequest")
        .query(params)
        .send()
        .await?;

    let request_url = response.url().to_string();
    let status = response.status();
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let body = response.text().await?;
    let body_preview: String = body.chars().take(500).collect();

    // Temporary diagnostic aid for the dashboard's "what is aenapply
    // actually returning" investigation — remove once that's resolved,
    // same convention as other debug logs added/removed in this codebase.
    eprintln!(
        "[dashboard-fetch] url={request_url} status={status} content-type={content_type:?} body_preview={body_preview:?}"
    );

    let is_html = content_type.to_ascii_lowercase().contains("text/html");
    if is_html {
        return Ok(None);
    }

    Ok(Some(serde_json::from_str(&body)?))
}

/// GETs a DataTables AJAX endpoint and parses the JSON response, with one
/// automatic recovery: if aenapply responds with an HTML page instead of
/// JSON, that's what a session-expired redirect looks like — and
/// `ensure_logged_in` alone can't catch it, since its session flag only
/// reflects what *we* think happened, not what the server currently
/// accepts. On that signal, this forces a real re-login (`force_relogin`,
/// which keeps the in-memory credentials and only clears the stale session
/// flag) then retries the request exactly once. Only a failure on that
/// second attempt is surfaced to the caller, so a single session hiccup
/// recovers invisibly instead of surfacing "DataTables response missing
/// 'data' array" (an HTML body obviously has no such field) or a raw JSON
/// decode error.
pub async fn fetch_datatables_json(state: &AppState, url: &str, params: &[(String, String)]) -> Result<Value, AppError> {
    if let Some(json) = send_datatables_request(state, url, params).await? {
        return Ok(json);
    }

    auth::force_relogin(state).await?;

    send_datatables_request(state, url, params)
        .await?
        .ok_or_else(|| AppError::Other("Session expired — please try again.".to_string()))
}
