use chrono::Utc;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub const DOWNLOAD_PROGRESS_EVENT: &str = "download-progress";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProgressStep {
    Starting,
    LoggingIn,
    DownloadingZip,
    ExtractingZip,
    Renaming,
    WritingFile,
    CreatingFolder,
    Done,
    Error,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ProgressLevel {
    Info,
    Warn,
    Error,
    Success,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProgressEvent {
    pub student_id: String,
    pub step: ProgressStep,
    pub message: String,
    pub level: ProgressLevel,
    pub timestamp: String,
}

/// Emits "download-progress" events scoped to a single student's download
/// job. The frontend filters on `student_id` so overlapping/stale listeners
/// can't cross-contaminate a log panel.
pub struct ProgressEmitter<'a> {
    app: &'a AppHandle,
    student_id: String,
}

impl<'a> ProgressEmitter<'a> {
    pub fn new(app: &'a AppHandle, student_id: String) -> Self {
        Self { app, student_id }
    }

    pub fn emit(&self, step: ProgressStep, level: ProgressLevel, message: impl Into<String>) {
        let event = ProgressEvent {
            student_id: self.student_id.clone(),
            step,
            message: message.into(),
            level,
            timestamp: Utc::now().to_rfc3339(),
        };
        // Emission failures (e.g. no listeners yet) are non-fatal to the download itself.
        let _ = self.app.emit(DOWNLOAD_PROGRESS_EVENT, event);
    }
}
