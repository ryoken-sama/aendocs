use crate::app_state::AppState;
use crate::auth;
use crate::errors::AppError;
use crate::students::{Section, STUDENTS_LIST_URL};
use std::collections::HashMap;
use tokio::task::JoinSet;

/// `permission_key -> accessible`. Every key from `probe_permissions` is
/// always present once probing has run once — `false` means "the server
/// returned something other than 2xx for this endpoint" (almost always a
/// 403), not "unknown".
pub type PermissionsMap = HashMap<String, bool>;

const NO_EXTRA_PARAMS: &[(&str, &str)] = &[];
const BRANCH_PARAMS: &[(&str, &str)] = &[("queryStrings[0][name]", "branch_id"), ("queryStrings[0][value]", "1")];
const AGENT_PARAMS: &[(&str, &str)] = &[("queryStrings[0][name]", "agent_id"), ("queryStrings[0][value]", "1")];
const COUNTRY_PARAMS: &[(&str, &str)] = &[("queryStrings[0][name]", "country_id"), ("queryStrings[0][value]", "1")];

/// The `/students` domain's 4 probe targets — sibling to the 7
/// `Section` variants (which supply their own URL/key via
/// `Section::url`/`Section::permission_key`).
const STUDENTS_PROBES: &[(&str, &[(&str, &str)])] = &[
    ("all_students", NO_EXTRA_PARAMS),
    ("by_branch", BRANCH_PARAMS),
    ("by_agent", AGENT_PARAMS),
    ("by_country", COUNTRY_PARAMS),
];

const ALL_SECTIONS: &[Section] = &[
    Section::Applications,
    Section::Applied,
    Section::Issued,
    Section::Processing,
    Section::Withdrawn,
    Section::Rejected,
    Section::Granted,
];

/// A minimal `draw/start/length=1` GET — enough to trigger the same
/// route-level authorization check a real request would, without needing
/// to replicate each section's full `columns[]` shape (that only affects
/// what data comes back on a 200, not whether the route allows the
/// request at all). Treats a transport-level failure as "not accessible"
/// rather than propagating it — one flaky probe shouldn't be able to
/// break the whole permissions map or delay the dashboard.
async fn probe(client: &reqwest::Client, url: &str, extra_params: &[(&str, &str)]) -> bool {
    let mut params: Vec<(&str, &str)> = vec![("draw", "1"), ("start", "0"), ("length", "1")];
    params.extend_from_slice(extra_params);

    match client
        .get(url)
        .header("X-Requested-With", "XMLHttpRequest")
        .query(&params)
        .send()
        .await
    {
        Ok(response) => response.status().is_success(),
        Err(e) => {
            eprintln!("[permissions] probe failed for {url}: {e}");
            false
        }
    }
}

/// Probes every endpoint listed in the permissions spec in parallel (one
/// request each) and returns which ones the current session can access.
/// Called only from `get_permissions`, which caches the result — this
/// itself always re-probes.
async fn probe_permissions(state: &AppState) -> PermissionsMap {
    let mut set: JoinSet<(String, bool)> = JoinSet::new();

    for section in ALL_SECTIONS {
        let client = state.http_client.clone();
        let url = section.url();
        let key = section.permission_key().to_string();
        set.spawn(async move {
            let ok = probe(&client, &url, NO_EXTRA_PARAMS).await;
            (key, ok)
        });
    }

    for (key, extra_params) in STUDENTS_PROBES {
        let client = state.http_client.clone();
        let key = key.to_string();
        let extra_params = *extra_params;
        set.spawn(async move {
            let ok = probe(&client, STUDENTS_LIST_URL, extra_params).await;
            (key, ok)
        });
    }

    let mut map = PermissionsMap::new();
    while let Some(result) = set.join_next().await {
        if let Ok((key, ok)) = result {
            map.insert(key, ok);
        }
    }
    map
}

/// Returns the cached permissions map if this session already probed one;
/// otherwise probes (see `probe_permissions`) and caches the result. Like
/// `profile::get_profile`, this is the one place callers should go through
/// — never call `probe_permissions` directly.
pub async fn get_permissions(state: &AppState) -> Result<PermissionsMap, AppError> {
    auth::ensure_logged_in(state).await?;

    {
        let cached = state.permissions.read().expect("permissions lock poisoned");
        if let Some(map) = cached.as_ref() {
            return Ok(map.clone());
        }
    }

    let map = probe_permissions(state).await;

    let mut cached = state.permissions.write().expect("permissions lock poisoned");
    *cached = Some(map.clone());
    Ok(map)
}

/// Drops the cached permissions map — called on logout/change-account so
/// the next login (possibly a different account) probes fresh.
pub fn clear(state: &AppState) {
    let mut cached = state.permissions.write().expect("permissions lock poisoned");
    *cached = None;
}
