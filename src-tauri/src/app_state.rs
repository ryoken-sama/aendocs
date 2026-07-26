use reqwest::Client;
use std::sync::RwLock;

pub struct SessionInfo {
    pub logged_in: bool,
}

pub struct AppState {
    pub http_client: Client,
    pub session: RwLock<Option<SessionInfo>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            http_client: crate::http_client::build_client(),
            session: RwLock::new(None),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
