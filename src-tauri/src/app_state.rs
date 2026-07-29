use crate::profile::UserProfile;
use reqwest::Client;
use std::sync::RwLock;

pub struct SessionInfo {
    pub logged_in: bool,
}

pub struct AppState {
    pub http_client: Client,
    pub session: RwLock<Option<SessionInfo>>,
    pub profile: RwLock<Option<UserProfile>>,
    /// Serializes concurrent login attempts (see `auth::ensure_logged_in`).
    /// An async mutex, not `std::sync::Mutex` — it's held across `.await`
    /// points during the actual login HTTP calls, which would be unsound
    /// (and a footgun for the async runtime) with a blocking mutex.
    pub login_lock: tokio::sync::Mutex<()>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            http_client: crate::http_client::build_client(),
            session: RwLock::new(None),
            profile: RwLock::new(None),
            login_lock: tokio::sync::Mutex::new(()),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
