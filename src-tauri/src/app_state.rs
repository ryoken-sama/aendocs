use crate::permissions::PermissionsMap;
use crate::profile::UserProfile;
use reqwest::Client;
use std::sync::RwLock;

pub struct SessionInfo {
    pub logged_in: bool,
}

/// Kept in memory for the lifetime of the app once a login succeeds —
/// regardless of "remember me" — so a mid-session expiry can be silently
/// recovered from (see `auth::ensure_logged_in`) even when the password was
/// never persisted to the keyring. Only "remember me" controls whether
/// these are *also* written to disk/keyring for the next launch.
#[derive(Clone)]
pub struct Credentials {
    pub email: String,
    pub password: String,
}

pub struct AppState {
    pub http_client: Client,
    pub session: RwLock<Option<SessionInfo>>,
    pub credentials: RwLock<Option<Credentials>>,
    pub profile: RwLock<Option<UserProfile>>,
    /// Cached once per login (see `permissions::get_permissions`) — cleared
    /// on logout/change-account alongside the session so a different
    /// account's next login re-probes fresh rather than inheriting stale
    /// results.
    pub permissions: RwLock<Option<PermissionsMap>>,
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
            credentials: RwLock::new(None),
            profile: RwLock::new(None),
            permissions: RwLock::new(None),
            login_lock: tokio::sync::Mutex::new(()),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
