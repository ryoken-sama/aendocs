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
    /// Private — go through `http_client()`/`reset_http_client()` rather
    /// than the field directly. `reqwest::Client` has no public API to
    /// clear an in-progress `cookie_store(true)` jar in place, so a full
    /// logout replaces the whole client with a fresh one (see
    /// `reset_http_client`) rather than trying to selectively evict one
    /// cookie.
    http_client: RwLock<Client>,
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
            http_client: RwLock::new(crate::http_client::build_client()),
            session: RwLock::new(None),
            credentials: RwLock::new(None),
            profile: RwLock::new(None),
            permissions: RwLock::new(None),
            login_lock: tokio::sync::Mutex::new(()),
        }
    }

    /// The current shared client — cheap to call repeatedly, since
    /// `Client` is just an `Arc`-backed handle under the hood (this
    /// codebase already relies on that elsewhere, e.g. `permissions.rs`
    /// cloning it once per spawned probe task).
    pub fn http_client(&self) -> Client {
        self.http_client.read().expect("http_client lock poisoned").clone()
    }

    /// Replaces the shared client with a brand new one — same config, but
    /// an empty cookie jar. Called from `auth::logout` on every full
    /// logout: without this, the old aenapply.com session cookie stays
    /// live in the jar, and a subsequent login (as the same or a
    /// different account) sent while that cookie is still valid can get
    /// silently redirected away from `/login` by the server's own
    /// "already authenticated" guard *before* the new credentials are
    /// ever processed — `login()`'s success heuristic (not landing back on
    /// `/login`) would then read that as a successful login, when the
    /// session backing every subsequent request is still the previous
    /// account's.
    pub fn reset_http_client(&self) {
        let mut client = self.http_client.write().expect("http_client lock poisoned");
        *client = crate::http_client::build_client();
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
