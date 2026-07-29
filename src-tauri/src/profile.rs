use crate::app_state::AppState;
use crate::auth;
use crate::config;
use crate::errors::AppError;
use reqwest::Client;
use scraper::{Html, Selector};
use serde::Serialize;
use tauri::AppHandle;

const PROFILE_URL_CANDIDATES: &[&str] = &["https://aenapply.com/user/profile", "https://aenapply.com/profile"];

#[derive(Debug, Clone, Serialize)]
pub struct UserProfile {
    pub name: String,
    pub photo_url: Option<String>,
}

fn resolve_url(src: &str) -> String {
    if src.starts_with("http://") || src.starts_with("https://") {
        src.to_string()
    } else {
        format!("https://aenapply.com/{}", src.trim_start_matches('/'))
    }
}

/// Best-effort scrape of the logged-in user's name/photo from a profile
/// page. UNVERIFIED — no sample HTML was available for either candidate
/// URL, so this tries a small set of plausible selectors (a profile-edit
/// form's `name` input, falling back to the first page heading, for the
/// name; an avatar-ish `<img>` for the photo) rather than anything
/// structurally specific. Returns `None` if nothing usable was found —
/// the caller falls back to the configured email + a generic icon.
fn parse_profile_html(html: &str) -> Option<UserProfile> {
    let document = Html::parse_document(html);

    let name = Selector::parse(r#"input[name="name"]"#)
        .ok()
        .and_then(|sel| document.select(&sel).next())
        .and_then(|el| el.value().attr("value"))
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .or_else(|| {
            Selector::parse("h1, h2, h3, h4").ok().and_then(|sel| {
                document
                    .select(&sel)
                    .map(|el| el.text().collect::<String>().trim().to_string())
                    .find(|s| !s.is_empty())
            })
        })?;

    let photo_url = Selector::parse("img[class*='avatar'], img[class*='rounded-circle'], img[class*='profile']")
        .ok()
        .and_then(|sel| document.select(&sel).next())
        .and_then(|el| el.value().attr("src"))
        .map(resolve_url);

    Some(UserProfile { name, photo_url })
}

async fn fetch_user_profile(client: &Client) -> Option<UserProfile> {
    for url in PROFILE_URL_CANDIDATES {
        let Ok(response) = client.get(*url).send().await else {
            continue;
        };
        if !response.status().is_success() {
            continue;
        }
        let Ok(html) = response.text().await else {
            continue;
        };
        if let Some(profile) = parse_profile_html(&html) {
            return Some(profile);
        }
    }
    None
}

/// Returns the cached profile if this session already fetched one;
/// otherwise ensures login, fetches (trying both candidate URLs), caches,
/// and returns it. Never fails the caller over a profile-fetch problem —
/// degrades to the configured email with no photo instead.
pub async fn get_profile(app: &AppHandle, state: &AppState) -> Result<UserProfile, AppError> {
    auth::ensure_logged_in(app, state).await?;

    {
        let cached = state.profile.read().expect("profile lock poisoned");
        if let Some(profile) = cached.as_ref() {
            return Ok(profile.clone());
        }
    }

    let fetched = fetch_user_profile(&state.http_client).await;
    let resolved = fetched.unwrap_or_else(|| UserProfile {
        name: config::load_settings(app).map(|s| s.email).unwrap_or_default(),
        photo_url: None,
    });

    let mut cached = state.profile.write().expect("profile lock poisoned");
    *cached = Some(resolved.clone());
    Ok(resolved)
}

/// Drops the cached profile — called on logout so the next login (possibly
/// as a different account) fetches fresh.
pub fn clear(state: &AppState) {
    let mut cached = state.profile.write().expect("profile lock poisoned");
    *cached = None;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_name_from_profile_form_input() {
        let html = r#"<html><body><form><input name="name" value="Prabin Dhakal"></form></body></html>"#;
        let profile = parse_profile_html(html).unwrap();
        assert_eq!(profile.name, "Prabin Dhakal");
        assert_eq!(profile.photo_url, None);
    }

    #[test]
    fn falls_back_to_heading_when_no_name_input() {
        let html = r#"<html><body><h2>Prabin Dhakal</h2></body></html>"#;
        let profile = parse_profile_html(html).unwrap();
        assert_eq!(profile.name, "Prabin Dhakal");
    }

    #[test]
    fn parses_avatar_photo_url_and_resolves_relative_path() {
        let html = r#"<html><body>
            <input name="name" value="Prabin Dhakal">
            <img class="rounded-circle avatar-xl" src="/storage/photos/prabin.jpg">
        </body></html>"#;
        let profile = parse_profile_html(html).unwrap();
        assert_eq!(profile.photo_url.as_deref(), Some("https://aenapply.com/storage/photos/prabin.jpg"));
    }

    #[test]
    fn keeps_absolute_photo_url_unchanged() {
        let html = r#"<html><body>
            <input name="name" value="Prabin Dhakal">
            <img class="avatar" src="https://cdn.example.com/p.jpg">
        </body></html>"#;
        let profile = parse_profile_html(html).unwrap();
        assert_eq!(profile.photo_url.as_deref(), Some("https://cdn.example.com/p.jpg"));
    }

    #[test]
    fn returns_none_when_nothing_useful_found() {
        assert!(parse_profile_html("<html><body>Nothing here.</body></html>").is_none());
    }
}
