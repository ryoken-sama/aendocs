use crate::app_state::{AppState, Credentials, SessionInfo};
use crate::config;
use crate::errors::AppError;
use crate::keyring_store;
use crate::students;
use reqwest::Client;
use scraper::{Html, Selector};
use serde::Serialize;
use tauri::AppHandle;

const LOGIN_URL: &str = "https://aenapply.com/login";
const SESSION_EXPIRED_MESSAGE: &str = "Session expired, please sign in again.";

#[derive(Debug, Clone, Serialize)]
pub struct LoginResult {
    pub success: bool,
    pub message: String,
}

/// GETs the login page and scrapes the Laravel CSRF `_token` hidden input.
pub async fn fetch_login_token(client: &Client) -> Result<String, AppError> {
    let html = client.get(LOGIN_URL).send().await?.text().await?;
    let document = Html::parse_document(&html);
    let selector = Selector::parse(r#"input[name="_token"]"#)
        .map_err(|e| AppError::Other(format!("failed to parse login-page selector: {e:?}")))?;
    document
        .select(&selector)
        .next()
        .and_then(|el| el.value().attr("value"))
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Other("could not find CSRF token on the login page".to_string()))
}

/// Performs the full Laravel CSRF login flow. Success is inferred from the
/// final URL after redirects: Laravel redirects away from /login on success
/// and re-renders /login (200) with validation errors on failure. This
/// heuristic must be confirmed against the real site once credentials are
/// available (see plan §10 — cannot be verified in this environment).
pub async fn login(client: &Client, email: &str, password: &str) -> Result<(), AppError> {
    let token = fetch_login_token(client).await?;
    let params = [
        ("email", email),
        ("password", password),
        ("_token", token.as_str()),
    ];
    let response = client.post(LOGIN_URL).form(&params).send().await?;
    let final_path = response.url().path().trim_end_matches('/').to_string();
    if final_path == "/login" {
        return Err(AppError::Other(
            "Login failed — check your email and password.".to_string(),
        ));
    }
    Ok(())
}

fn clear_session(state: &AppState) {
    let mut session = state.session.write().expect("session lock poisoned");
    *session = None;
}

/// Clears the in-memory session, credentials, cached permissions map, AND
/// the shared HTTP client's cookie jar (see `AppState::reset_http_client`)
/// — after this, `ensure_logged_in` will fail (return "not logged in")
/// until a fresh `sign_in`/`auto_login` happens, and the next one re-probes
/// permissions and starts from an empty cookie jar rather than reusing a
/// possibly different account's results or session cookie. The cookie
/// jar reset matters as much as the rest: without it, the old aenapply.com
/// session cookie stays valid and attached to every request, and a
/// subsequent login attempt (even as a different account) can get
/// redirected away from `/login` by the server's own "already
/// authenticated" guard before the new credentials are ever checked —
/// `login()` would read that as success while the server is still
/// authenticated as whoever was logged in before. Does not touch anything
/// on disk (saved settings/keyring) — see
/// `logout_and_maybe_forget`/`change_account` for that.
pub fn logout(state: &AppState) {
    clear_session(state);
    let mut creds = state.credentials.write().expect("credentials lock poisoned");
    *creds = None;
    crate::permissions::clear(state);
    state.reset_http_client();
}

/// The one place that actually performs a login HTTP round-trip and, on
/// success, populates both `state.credentials` (kept in memory for the
/// rest of this run, regardless of "remember me", so a mid-session expiry
/// can silently re-login — see `ensure_logged_in`) and `state.session`.
/// Callers are responsible for holding `login_lock` around this.
async fn perform_login(state: &AppState, email: &str, password: &str) -> Result<(), AppError> {
    login(&state.http_client(), email, password).await?;
    {
        let mut creds = state.credentials.write().expect("credentials lock poisoned");
        *creds = Some(Credentials {
            email: email.to_string(),
            password: password.to_string(),
        });
    }
    let mut session = state.session.write().expect("session lock poisoned");
    *session = Some(SessionInfo { logged_in: true });
    Ok(())
}

/// Idempotent session guard: re-logs in using the in-memory credentials
/// (set by a prior `sign_in`/`auto_login`) only if there isn't already a
/// live session, so callers (search, detail, download) never need to
/// sequence login themselves. Fails with "Not logged in." if called before
/// any login has ever succeeded — under the current app shell that
/// shouldn't happen, since the data providers that call this only mount
/// after a successful sign-in/auto-login (see AuthGate on the frontend).
///
/// Double-checked locking: dashboard load alone fires ~15-20 of these in
/// parallel, and without the lock every single one would see "not logged
/// in" and independently start its own login flow against the same
/// cookie-jar `http_client` — wasteful (N redundant login POSTs instead of
/// one) and actively broken (concurrent logins race on that one shared
/// cookie jar, so some end up with a clobbered/invalid session cookie).
/// The first caller through the lock does the real login; every caller
/// that was waiting behind it re-checks the session — now populated by the
/// winner — and returns immediately instead of logging in again.
pub async fn ensure_logged_in(state: &AppState) -> Result<(), AppError> {
    {
        let session = state.session.read().expect("session lock poisoned");
        if session.as_ref().is_some_and(|s| s.logged_in) {
            return Ok(());
        }
    }

    let _login_guard = state.login_lock.lock().await;

    {
        let session = state.session.read().expect("session lock poisoned");
        if session.as_ref().is_some_and(|s| s.logged_in) {
            return Ok(());
        }
    }

    let creds = {
        let creds = state.credentials.read().expect("credentials lock poisoned");
        creds.clone()
    };
    let creds = creds.ok_or_else(|| AppError::Other("Not logged in.".to_string()))?;

    perform_login(state, &creds.email, &creds.password).await
}

/// Clears the (possibly stale) session flag — keeping the in-memory
/// credentials intact — and forces a real login attempt, going through
/// `ensure_logged_in`'s normal locked path rather than duplicating it. Used
/// by the dashboard's "Retry" button after a session-expired error: plain
/// `ensure_logged_in` alone would short-circuit and do nothing if the
/// stale flag still claims "logged in", so clicking Retry wouldn't
/// actually attempt a fresh login before refetching — this guarantees it
/// does.
pub async fn force_relogin(state: &AppState) -> Result<(), AppError> {
    clear_session(state);
    ensure_logged_in(state).await
}

/// The Login screen's explicit sign-in. Always attempts a fresh login with
/// the given credentials (never consults the cached session). On success,
/// persists them to the keyring/settings only if `remember_me` — either
/// way, `state.credentials` is set for the rest of this run so a
/// mid-session expiry can still silently re-login (see `ensure_logged_in`).
pub async fn sign_in(app: &AppHandle, state: &AppState, email: &str, password: &str, remember_me: bool) -> LoginResult {
    let _login_guard = state.login_lock.lock().await;

    if let Err(e) = perform_login(state, email, password).await {
        return LoginResult {
            success: false,
            message: e.to_string(),
        };
    }

    if remember_me {
        if let Err(e) = keyring_store::set_password(email, password) {
            return LoginResult {
                success: false,
                message: e.to_string(),
            };
        }
        if let Err(e) = config::save_account(app, email, true) {
            return LoginResult {
                success: false,
                message: e.to_string(),
            };
        }
    }

    LoginResult {
        success: true,
        message: "Login successful.".to_string(),
    }
}

/// Launch-time auto-login: if a previous session was saved with "Remember
/// me", uses the keyring password to log in silently. Returns `Ok(None)`
/// (not an error) when there's nothing saved, so the frontend can tell
/// "no saved account — show the Login screen directly" apart from "tried
/// and failed". A failed attempt reports the fixed "Session expired"
/// message rather than the raw login error, since from the user's
/// perspective this is their previously-working session having gone
/// stale, not a fresh login mistake.
pub async fn auto_login(app: &AppHandle, state: &AppState) -> Result<Option<LoginResult>, AppError> {
    let settings = config::load_settings(app)?;
    if !settings.remember_me || settings.email.is_empty() {
        return Ok(None);
    }
    let password = match keyring_store::get_password(&settings.email)? {
        Some(p) => p,
        None => return Ok(None),
    };

    let _login_guard = state.login_lock.lock().await;
    match perform_login(state, &settings.email, &password).await {
        Ok(()) => Ok(Some(LoginResult {
            success: true,
            message: "Login successful.".to_string(),
        })),
        Err(_) => Ok(Some(LoginResult {
            success: false,
            message: SESSION_EXPIRED_MESSAGE.to_string(),
        })),
    }
}

/// Profile-menu "Logout": clears the session (and in-memory credentials)
/// always; additionally forgets the saved keyring/account only if
/// "Remember me" was on for it — a session that was never remembered has
/// nothing else to clear. Always clears the on-disk filter options cache
/// (see `students::clear_filter_options_cache`) regardless of "Remember
/// me": whoever signs in next — same account or a different one — should
/// never see a previous account's cached Branch/Agent/Country/Institution
/// lists.
pub fn logout_and_maybe_forget(app: &AppHandle, state: &AppState) -> Result<(), AppError> {
    logout(state);
    students::clear_filter_options_cache(app)?;
    let settings = config::load_settings(app)?;
    if settings.remember_me && !settings.email.is_empty() {
        keyring_store::delete_password(&settings.email)?;
        config::clear_account(app)?;
    }
    Ok(())
}

/// Settings screen's "Change Account": unconditionally clears the session,
/// any saved keyring/account, and the filter options cache, regardless of
/// whether "Remember me" was on — this is an explicit "let me sign in as
/// someone else" action.
pub fn change_account(app: &AppHandle, state: &AppState) -> Result<(), AppError> {
    logout(state);
    students::clear_filter_options_cache(app)?;
    let settings = config::load_settings(app)?;
    if !settings.email.is_empty() {
        keyring_store::delete_password(&settings.email)?;
    }
    config::clear_account(app)
}
