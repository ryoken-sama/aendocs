use crate::app_state::AppState;
use crate::auth;
use crate::checklist::{self, DocStatus};
use crate::config;
use crate::errors::AppError;
use crate::path_builder;
use crate::progress::{ProgressEmitter, ProgressLevel, ProgressStep};
use crate::rename_rules;
use crate::students::StudentSummary;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Cursor, Read};
use std::path::PathBuf;
use tauri::AppHandle;

const MAKE_ZIP_URL_BASE: &str = "https://aenapply.com/offerapplications/application";
const STUDENT_DETAIL_URL_BASE: &str = "https://aenapply.com/offerapplications/show";

/// The ZIP local-file-header magic bytes ("PK"), used as a fallback signal
/// when a server omits or mislabels the Content-Type header.
const ZIP_MAGIC: &[u8] = &[0x50, 0x4B];

#[derive(Debug, Clone, Serialize)]
pub struct DownloadSummary {
    pub files_written: u32,
    pub skipped: u32,
    pub output_path: String,
    pub missing_categories: Vec<String>,
}

/// GETs the student detail page and scrapes the Laravel CSRF token from
/// `<meta name="csrf-token" content="...">` — the make-zip route requires
/// this as an `X-CSRF-TOKEN` header (it 419s without it).
async fn fetch_csrf_token(client: &reqwest::Client, offerapplication_id: &str) -> Result<String, AppError> {
    let url = format!("{STUDENT_DETAIL_URL_BASE}/{offerapplication_id}");
    let html = client.get(&url).send().await?.text().await?;
    let document = Html::parse_document(&html);
    let selector = Selector::parse(r#"meta[name="csrf-token"]"#)
        .map_err(|e| AppError::Other(format!("failed to parse csrf-token selector: {e:?}")))?;
    document
        .select(&selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Other("could not find csrf-token meta tag on the detail page".to_string()))
}

/// The make-zip endpoint's JSON response shape — it doesn't return the ZIP
/// directly, just confirmation that one was built and a URL to fetch it from.
#[derive(Debug, Deserialize)]
struct MakeZipResponse {
    status: bool,
    message: String,
    download_url: Option<String>,
}

/// Logs a `Warn`-level progress event with a preview of an unexpected
/// response body, so the actual cause (typically an HTML error/login page)
/// is visible in the progress log instead of an opaque downstream failure.
fn log_unexpected_body(
    emitter: &ProgressEmitter<'_>,
    method: &str,
    url: &str,
    status: reqwest::StatusCode,
    content_type: &str,
    body: &[u8],
) {
    let preview_len = body.len().min(500);
    let preview = String::from_utf8_lossy(&body[..preview_len]);
    emitter.emit(
        ProgressStep::DownloadingZip,
        ProgressLevel::Warn,
        format!(
            "{method} {url} did not return the expected response (status {status}, content-type '{content_type}'). \
             First {preview_len} bytes of body: {preview}"
        ),
    );
}

/// Fetches the document ZIP in two steps, per the real make-zip contract:
/// 1. POST to the make-zip endpoint with the CSRF token and AJAX header it
///    requires (GET is unsupported — 405 — and POST without the token
///    419s). This returns JSON confirming the ZIP was built server-side,
///    along with a `download_url` to fetch it from — not the ZIP itself.
/// 2. GET that `download_url` to fetch the actual ZIP bytes.
///
/// Uses `state.http_client` — the single shared, cookie-store-enabled client
/// also used for login — for both requests, so the session cookie is sent
/// automatically; no manual cookie handling is needed.
async fn fetch_zip_bytes(
    client: &reqwest::Client,
    make_zip_url: &str,
    csrf_token: &str,
    emitter: &ProgressEmitter<'_>,
) -> Result<Vec<u8>, AppError> {
    let response = client
        .post(make_zip_url)
        .header("X-CSRF-TOKEN", csrf_token)
        .header("X-Requested-With", "XMLHttpRequest")
        .send()
        .await?;
    let status = response.status();
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    let body = response.bytes().await?.to_vec();

    if !status.is_success() {
        log_unexpected_body(emitter, "POST", make_zip_url, status, &content_type, &body);
        return Err(AppError::Other(format!(
            "make-zip endpoint returned status {status}: {make_zip_url}"
        )));
    }

    let parsed: MakeZipResponse = serde_json::from_slice(&body).map_err(|e| {
        log_unexpected_body(emitter, "POST", make_zip_url, status, &content_type, &body);
        AppError::Other(format!("make-zip response was not the expected JSON shape: {e}"))
    })?;

    if !parsed.status {
        return Err(AppError::Other(format!("make-zip reported failure: {}", parsed.message)));
    }
    let download_url = parsed
        .download_url
        .ok_or_else(|| AppError::Other("make-zip response missing 'download_url'".to_string()))?;

    emitter.emit(
        ProgressStep::DownloadingZip,
        ProgressLevel::Info,
        format!("Fetching ZIP file from {download_url}"),
    );

    let zip_response = client.get(&download_url).send().await?;
    let zip_status = zip_response.status();
    let zip_content_type = zip_response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    let zip_bytes = zip_response.bytes().await?.to_vec();

    let content_type_looks_like_zip = {
        let lower = zip_content_type.to_ascii_lowercase();
        lower.contains("zip") || lower.contains("octet-stream")
    };
    let has_zip_magic = zip_bytes.starts_with(ZIP_MAGIC);

    if zip_status.is_success() && (content_type_looks_like_zip || has_zip_magic) {
        return Ok(zip_bytes);
    }

    log_unexpected_body(emitter, "GET", &download_url, zip_status, &zip_content_type, &zip_bytes);
    Err(AppError::Other(format!(
        "download_url did not return a ZIP file: {download_url} (status {zip_status})"
    )))
}

/// Downloads the document ZIP, extracts/renames/organizes it, and emits
/// progress events throughout. Any failure is reported both as a final
/// "download-progress" error event and as the returned `Err`.
pub async fn download_and_organize(
    app: &AppHandle,
    state: &AppState,
    student: &StudentSummary,
    category_overrides: &HashMap<String, String>,
) -> Result<DownloadSummary, AppError> {
    let emitter = ProgressEmitter::new(app, student.id.clone());
    match run(app, state, student, category_overrides, &emitter).await {
        Ok(summary) => Ok(summary),
        Err(e) => {
            emitter.emit(ProgressStep::Error, ProgressLevel::Error, e.to_string());
            Err(e)
        }
    }
}

async fn run(
    app: &AppHandle,
    state: &AppState,
    student: &StudentSummary,
    category_overrides: &HashMap<String, String>,
    emitter: &ProgressEmitter<'_>,
) -> Result<DownloadSummary, AppError> {
    emitter.emit(
        ProgressStep::Starting,
        ProgressLevel::Info,
        format!("Starting download for {}", student.name),
    );

    emitter.emit(ProgressStep::LoggingIn, ProgressLevel::Info, "Checking session…");
    auth::ensure_logged_in(app, state).await?;

    emitter.emit(
        ProgressStep::DownloadingZip,
        ProgressLevel::Info,
        "Fetching CSRF token…",
    );
    let csrf_token = fetch_csrf_token(&state.http_client, &student.id).await?;

    emitter.emit(
        ProgressStep::DownloadingZip,
        ProgressLevel::Info,
        "Downloading document ZIP…",
    );
    let url = format!("{MAKE_ZIP_URL_BASE}/{}/make-zip", student.id);
    let bytes = fetch_zip_bytes(&state.http_client, &url, &csrf_token, emitter).await?;

    emitter.emit(ProgressStep::ExtractingZip, ProgressLevel::Info, "Extracting ZIP…");
    let cursor = Cursor::new(bytes);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| AppError::Other(format!("failed to read ZIP: {e}")))?;

    // First pass: determine a category for every file entry (skip directory
    // entries) so collision numbering can be resolved before anything is
    // written. The staff's manual dropdown choice — keyed by the ZIP entry's
    // own filename, since that's the only key shared between the detail
    // page's document list and the ZIP (the display name is not) — takes
    // priority; an explicit "Manually Rename" choice means "leave
    // unrenamed", same as no match at all. Entries the staff never
    // saw/categorized (missing from the overrides map) fall back to
    // automatic keyword classification.
    let mut skipped = 0u32;
    let mut entries: Vec<(usize, String, Option<String>)> = Vec::new();
    for i in 0..archive.len() {
        let entry = archive
            .by_index(i)
            .map_err(|e| AppError::Other(format!("failed to read ZIP entry: {e}")))?;
        if entry.is_dir() {
            skipped += 1;
            continue;
        }
        let name = entry.name().to_string();
        let base_name = name.rsplit('/').next().unwrap_or(&name).to_string();

        let category = match category_overrides.get(&base_name).map(String::as_str) {
            Some("Manually Rename") | Some("") => None,
            Some(chosen) => Some(chosen.to_string()),
            None => rename_rules::classify(&base_name).map(|c| c.to_string()),
        };
        entries.push((i, base_name, category));
    }

    emitter.emit(ProgressStep::Renaming, ProgressLevel::Info, "Classifying documents…");
    let recognized: Vec<(String, String)> = entries
        .iter()
        .filter_map(|(_, name, category)| category.clone().map(|c| (name.clone(), c)))
        .collect();
    let resolved = rename_rules::resolve_collisions(&recognized);
    let mut final_name_by_orig: HashMap<String, String> = HashMap::new();
    for (orig, final_name) in resolved {
        final_name_by_orig.entry(orig).or_insert(final_name);
    }

    let settings = config::load_settings(app)?;
    let output_base = PathBuf::from(&settings.output_folder);
    let output_dir = path_builder::build_output_path(
        &output_base,
        &student.country,
        &student.branch,
        &student.name,
        &student.university,
    );
    std::fs::create_dir_all(&output_dir)?;
    emitter.emit(
        ProgressStep::CreatingFolder,
        ProgressLevel::Info,
        format!("Output folder: {}", output_dir.display()),
    );

    let mut files_written = 0u32;
    let mut present_categories: Vec<String> = Vec::new();

    for (index, base_name, category) in &entries {
        let mut entry = archive
            .by_index(*index)
            .map_err(|e| AppError::Other(format!("failed to read ZIP entry: {e}")))?;
        let mut buf = Vec::new();
        entry.read_to_end(&mut buf)?;
        drop(entry);

        let dest_path = if let Some(category) = category {
            if !present_categories.iter().any(|c| c == category) {
                present_categories.push(category.clone());
            }
            let final_name = final_name_by_orig
                .get(base_name)
                .cloned()
                .unwrap_or_else(|| format!("{category}.pdf"));
            output_dir.join(final_name)
        } else {
            emitter.emit(
                ProgressStep::Renaming,
                ProgressLevel::Warn,
                format!("Unrecognized document: {base_name} — keeping original filename"),
            );
            output_dir.join(path_builder::sanitize_component(base_name))
        };

        let action = if dest_path.exists() { "Overwriting" } else { "Creating" };
        emitter.emit(
            ProgressStep::WritingFile,
            ProgressLevel::Info,
            format!("{action} {}", dest_path.display()),
        );
        std::fs::write(&dest_path, &buf)?;
        files_written += 1;
    }

    let requirements_path = config::university_requirements_path(app)?;
    let requirements = checklist::load_requirements(&requirements_path)?;
    let statuses = checklist::compute_status(&student.university, &present_categories, &requirements);
    let missing_categories: Vec<String> = statuses
        .into_iter()
        .filter(|s| s.status == DocStatus::Missing)
        .map(|s| s.category)
        .collect();

    emitter.emit(
        ProgressStep::Done,
        ProgressLevel::Success,
        format!("Done — {files_written} file(s) written."),
    );

    Ok(DownloadSummary {
        files_written,
        skipped,
        output_path: output_dir.to_string_lossy().to_string(),
        missing_categories,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_make_zip_response_shape() {
        let raw = r#"{
            "status": true,
            "message": "ZIP file created successfully.",
            "download_url": "https://aenapply.com/storage/access/zips/Prabin_Dhakal_documents.zip"
        }"#;
        let parsed: MakeZipResponse = serde_json::from_str(raw).unwrap();
        assert!(parsed.status);
        assert_eq!(parsed.message, "ZIP file created successfully.");
        assert_eq!(
            parsed.download_url.as_deref(),
            Some("https://aenapply.com/storage/access/zips/Prabin_Dhakal_documents.zip")
        );
    }

    #[test]
    fn parses_make_zip_response_without_download_url() {
        let raw = r#"{ "status": false, "message": "No documents found." }"#;
        let parsed: MakeZipResponse = serde_json::from_str(raw).unwrap();
        assert!(!parsed.status);
        assert_eq!(parsed.download_url, None);
    }
}
