use crate::app_state::{AppState, SessionInfo};
use crate::config;
use crate::errors::AppError;
use crate::keyring_store;
use reqwest::Client;
use scraper::{Html, Selector};
use serde::Serialize;
use tauri::AppHandle;

const LOGIN_URL: &str = "https://aenapply.com/login";

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

/// Idempotent session guard: logs in using the stored email/keyring password
/// only if there isn't already a live session, so callers (search, detail,
/// download) never need to sequence login themselves.
///
/// Double-checked locking: dashboard load alone fires ~15-20 of these in
/// parallel on a cold session, and without the lock every single one would
/// see "not logged in" and independently start its own login flow against
/// the same cookie-jar `http_client` — wasteful (N redundant login POSTs
/// instead of one) and actively broken (concurrent logins race on that one
/// shared cookie jar, so some end up with a clobbered/invalid session
/// cookie). The first caller through the lock does the real login; every
/// caller that was waiting behind it re-checks the session — now populated
/// by the winner — and returns immediately instead of logging in again.
pub async fn ensure_logged_in(app: &AppHandle, state: &AppState) -> Result<(), AppError> {
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

    let settings = config::load_settings(app)?;
    if settings.email.is_empty() {
        return Err(AppError::Other(
            "No aenapply.com email configured — set it in Settings.".to_string(),
        ));
    }
    let password = keyring_store::get_password(&settings.email)?.ok_or_else(|| {
        AppError::Other("No password saved for this email — set it in Settings.".to_string())
    })?;

    login(&state.http_client, &settings.email, &password).await?;

    let mut session = state.session.write().expect("session lock poisoned");
    *session = Some(SessionInfo { logged_in: true });
    Ok(())
}

/// Explicit validation affordance for the Settings screen: always attempts a
/// fresh login rather than relying on/consulting the cached session.
pub async fn test_login(app: &AppHandle, state: &AppState) -> LoginResult {
    let settings = match config::load_settings(app) {
        Ok(s) => s,
        Err(e) => {
            return LoginResult {
                success: false,
                message: e.to_string(),
            }
        }
    };
    if settings.email.is_empty() {
        return LoginResult {
            success: false,
            message: "Enter an email and save settings first.".to_string(),
        };
    }
    let password = match keyring_store::get_password(&settings.email) {
        Ok(Some(p)) => p,
        Ok(None) => {
            return LoginResult {
                success: false,
                message: "No password saved yet — enter one and save settings first.".to_string(),
            }
        }
        Err(e) => {
            return LoginResult {
                success: false,
                message: e.to_string(),
            }
        }
    };

    match login(&state.http_client, &settings.email, &password).await {
        Ok(()) => {
            let mut session = state.session.write().expect("session lock poisoned");
            *session = Some(SessionInfo { logged_in: true });
            LoginResult {
                success: true,
                message: "Login successful.".to_string(),
            }
        }
        Err(e) => LoginResult {
            success: false,
            message: e.to_string(),
        },
    }
}

/// Clears the in-memory session — the next request that needs one (via
/// `ensure_logged_in`) will log in again using whatever email/password are
/// currently saved in Settings. Does not touch the saved settings or
/// keyring password themselves.
pub fn logout(state: &AppState) {
    let mut session = state.session.write().expect("session lock poisoned");
    *session = None;
}
