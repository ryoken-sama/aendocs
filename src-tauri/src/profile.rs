use crate::app_state::AppState;
use crate::auth;
use crate::errors::AppError;
use reqwest::Client;
use scraper::{ElementRef, Html, Selector};
use serde::Serialize;

const PROFILE_URL: &str = "https://aenapply.com/profile";

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

/// The name isn't inside the `<img>` itself (images carry no text content)
/// — it's rendered as nearby text around the avatar, inside whatever
/// profile-dropdown-toggle wraps it. Confirmed CSS target is only the
/// image (`img.header-profile-user`); "near the profile image" for the
/// name isn't a specific selector, so this takes the enclosing element's
/// own text first, falling back to a couple of generic patterns already
/// used elsewhere in the app if that comes up empty.
fn extract_name_near(document: &Html, img: &ElementRef) -> String {
    img.parent()
        .and_then(ElementRef::wrap)
        .map(|el| el.text().collect::<String>().trim().to_string())
        .filter(|s| !s.is_empty())
        .or_else(|| {
            Selector::parse(r#"input[name="name"]"#).ok().and_then(|sel| {
                document
                    .select(&sel)
                    .next()
                    .and_then(|el| el.value().attr("value"))
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
            })
        })
        .or_else(|| {
            Selector::parse("h1, h2, h3, h4").ok().and_then(|sel| {
                document
                    .select(&sel)
                    .map(|el| el.text().collect::<String>().trim().to_string())
                    .find(|s| !s.is_empty())
            })
        })
        .unwrap_or_default()
}

/// Scrapes `https://aenapply.com/profile` for the logged-in user's photo
/// (confirmed target: `img.header-profile-user`'s `src`) and name (best
/// effort — see extract_name_near). Returns `None` only if the confirmed
/// photo selector itself matches nothing, since that's the one signal
/// here that's actually been checked against the live site.
fn parse_profile_html(html: &str) -> Option<UserProfile> {
    let document = Html::parse_document(html);

    let img_selector = Selector::parse("img.header-profile-user").ok()?;
    let img = document.select(&img_selector).next()?;
    let photo_url = img.value().attr("src").map(resolve_url);
    let name = extract_name_near(&document, &img);

    Some(UserProfile { name, photo_url })
}

async fn fetch_user_profile(client: &Client) -> Option<UserProfile> {
    let response = client.get(PROFILE_URL).send().await.ok()?;
    if !response.status().is_success() {
        return None;
    }
    let html = response.text().await.ok()?;
    parse_profile_html(&html)
}

/// The signed-in email — used as a last-resort display name fallback. Reads
/// the in-memory credentials (set by `sign_in`/`auto_login`) rather than
/// saved settings, since a "don't remember me" session never writes its
/// email to disk but is still the account actually logged in right now.
fn current_email(state: &AppState) -> String {
    state
        .credentials
        .read()
        .expect("credentials lock poisoned")
        .as_ref()
        .map(|c| c.email.clone())
        .unwrap_or_default()
}

/// Returns the cached profile if this session already fetched one;
/// otherwise ensures login, fetches, caches, and returns it. Never fails
/// the caller over a profile-fetch problem — degrades to the signed-in
/// email (if the name specifically couldn't be found) and no photo.
pub async fn get_profile(state: &AppState) -> Result<UserProfile, AppError> {
    auth::ensure_logged_in(state).await?;

    {
        let cached = state.profile.read().expect("profile lock poisoned");
        if let Some(profile) = cached.as_ref() {
            return Ok(profile.clone());
        }
    }

    let fetched = fetch_user_profile(&state.http_client).await;
    let resolved = match fetched {
        Some(mut profile) => {
            if profile.name.is_empty() {
                profile.name = current_email(state);
            }
            profile
        }
        None => UserProfile {
            name: current_email(state),
            photo_url: None,
        },
    };

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
    fn parses_photo_and_name_from_confirmed_selector() {
        let html = r#"<html><body>
            <a class="nav-link dropdown-toggle" href="/profile">
              <img class="rounded-circle header-profile-user" src="/storage/photos/prabin.jpg">
              <span>Prabin Dhakal</span>
            </a>
        </body></html>"#;
        let profile = parse_profile_html(html).unwrap();
        assert_eq!(profile.photo_url.as_deref(), Some("https://aenapply.com/storage/photos/prabin.jpg"));
        assert_eq!(profile.name, "Prabin Dhakal");
    }

    #[test]
    fn keeps_absolute_photo_url_unchanged() {
        let html = r#"<img class="header-profile-user" src="https://cdn.example.com/p.jpg">"#;
        let profile = parse_profile_html(html).unwrap();
        assert_eq!(profile.photo_url.as_deref(), Some("https://cdn.example.com/p.jpg"));
    }

    #[test]
    fn falls_back_to_name_input_when_nothing_near_the_image() {
        let html = r#"<html><body>
            <img class="header-profile-user" src="/p.jpg">
            <input name="name" value="Prabin Dhakal">
        </body></html>"#;
        let profile = parse_profile_html(html).unwrap();
        assert_eq!(profile.name, "Prabin Dhakal");
    }

    #[test]
    fn returns_none_when_confirmed_selector_matches_nothing() {
        assert!(parse_profile_html("<html><body>Nothing here.</body></html>").is_none());
    }
}
