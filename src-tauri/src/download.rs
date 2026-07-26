use crate::app_state::AppState;
use crate::auth;
use crate::checklist::{self, DocStatus};
use crate::config;
use crate::errors::AppError;
use crate::path_builder;
use crate::progress::{ProgressEmitter, ProgressLevel, ProgressStep};
use crate::rename_rules;
use crate::students::StudentSummary;
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Cursor, Read};
use std::path::PathBuf;
use tauri::AppHandle;

const MAKE_ZIP_URL_BASE: &str = "https://aenapply.com/offerapplications/make-zip";

#[derive(Debug, Clone, Serialize)]
pub struct DownloadSummary {
    pub files_written: u32,
    pub skipped: u32,
    pub output_path: String,
    pub missing_categories: Vec<String>,
}

/// Downloads the document ZIP, extracts/renames/organizes it, and emits
/// progress events throughout. Any failure is reported both as a final
/// "download-progress" error event and as the returned `Err`.
pub async fn download_and_organize(
    app: &AppHandle,
    state: &AppState,
    student: &StudentSummary,
) -> Result<DownloadSummary, AppError> {
    let emitter = ProgressEmitter::new(app, student.id.clone());
    match run(app, state, student, &emitter).await {
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
        "Downloading document ZIP…",
    );
    let url = format!("{MAKE_ZIP_URL_BASE}/{}", student.id);
    let bytes = state.http_client.get(&url).send().await?.bytes().await?;

    emitter.emit(ProgressStep::ExtractingZip, ProgressLevel::Info, "Extracting ZIP…");
    let cursor = Cursor::new(bytes.to_vec());
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| AppError::Other(format!("failed to read ZIP: {e}")))?;

    // First pass: classify every file entry (skip directory entries) so
    // collision numbering can be resolved before anything is written.
    let mut skipped = 0u32;
    let mut entries: Vec<(usize, String, Option<&'static str>)> = Vec::new();
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
        let category = rename_rules::classify(&base_name);
        entries.push((i, base_name, category));
    }

    emitter.emit(ProgressStep::Renaming, ProgressLevel::Info, "Classifying documents…");
    let recognized: Vec<(String, &'static str)> = entries
        .iter()
        .filter_map(|(_, name, category)| category.map(|c| (name.clone(), c)))
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

    let other_dir = output_dir.join("Other");
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
                present_categories.push(category.to_string());
            }
            let final_name = final_name_by_orig
                .get(base_name)
                .cloned()
                .unwrap_or_else(|| format!("{category}.pdf"));
            output_dir.join(final_name)
        } else {
            std::fs::create_dir_all(&other_dir)?;
            emitter.emit(
                ProgressStep::Renaming,
                ProgressLevel::Warn,
                format!("Unrecognized document: {base_name} — placed in Other/"),
            );
            other_dir.join(path_builder::sanitize_component(base_name))
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
