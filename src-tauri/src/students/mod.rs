mod applications_link_parser;
mod dashboard;
mod datatables_client;
mod detail_parser;
mod filter_options_parser;
mod html_util;
mod list_parser;
mod search_parser;
mod section;

pub use applications_link_parser::StudentApplicationLink;
pub use dashboard::{get_recent_applications, RecentApplication};
pub use detail_parser::StudentDetail;
pub use filter_options_parser::FilterOptions;
pub use list_parser::StudentListResult;
pub use search_parser::{StudentSearchResult, StudentSummary};
pub use section::Section;

use crate::app_state::AppState;
use crate::auth;
use crate::config;
use crate::errors::AppError;
use std::path::PathBuf;
use tauri::AppHandle;

const STUDENTS_URL: &str = "https://aenapply.com/offerapplications";
const STUDENT_DETAIL_URL_BASE: &str = "https://aenapply.com/offerapplications/show";
const FILTER_OPTIONS_CACHE_FILE: &str = "filter_options_cache.json";
pub(crate) const STUDENTS_LIST_URL: &str = "https://aenapply.com/students";
const STUDENT_PROFILE_URL_BASE: &str = "https://aenapply.com/students/show";

/// The exact `columns[]` the `/students` DataTables endpoint expects, in
/// order — `DT_RowIndex` is column 0, matching the fixed `order[0]` below.
const STUDENTS_LIST_COLUMNS: &[&str] = &[
    "DT_RowIndex",
    "created_at",
    "name",
    "email",
    "mobile",
    "countries_id",
    "counselor_assigned",
    "associate",
    "visa",
    "action",
];

/// Server-side filters supported by the `/offerapplications` DataTables
/// endpoint via `queryStrings[n][name]`/`queryStrings[n][value]` pairs — each
/// select's underlying database ID, not its display name. Empty string means
/// "no filter" for that field.
pub struct SearchFilters<'a> {
    pub branch_id: &'a str,
    pub agent_id: &'a str,
    pub country_id: &'a str,
    pub institution_id: &'a str,
}

pub async fn search_students(
    state: &AppState,
    query: &str,
    start: u32,
    length: u32,
    section: Section,
    filters: &SearchFilters<'_>,
) -> Result<StudentSearchResult, AppError> {
    auth::ensure_logged_in(state).await?;

    let mut params: Vec<(String, String)> = vec![
        ("draw".to_string(), "1".to_string()),
        ("start".to_string(), start.to_string()),
        ("length".to_string(), length.to_string()),
        ("search[value]".to_string(), query.to_string()),
    ];

    // Each of the 7 sidebar views is backed by a differently-shaped
    // DataTables table server-side, so the `columns[]` sent must match
    // exactly what that view expects (see Section::columns). `student` is
    // always column 0, matching the fixed order[0] below.
    for (i, column) in section.columns().iter().enumerate() {
        let orderable_and_searchable = *column != "action";
        params.push((format!("columns[{i}][data]"), column.to_string()));
        params.push((format!("columns[{i}][name]"), column.to_string()));
        params.push((
            format!("columns[{i}][searchable]"),
            orderable_and_searchable.to_string(),
        ));
        params.push((
            format!("columns[{i}][orderable]"),
            orderable_and_searchable.to_string(),
        ));
        params.push((format!("columns[{i}][search][value]"), String::new()));
        params.push((format!("columns[{i}][search][regex]"), "false".to_string()));
    }
    params.push(("order[0][column]".to_string(), "0".to_string()));
    params.push(("order[0][dir]".to_string(), "asc".to_string()));
    params.push(("order[0][name]".to_string(), "student".to_string()));

    // Field name here is exactly the filtered <select>'s `name` attribute on
    // the /offerapplications page (see filter_options_parser.rs) — the
    // country_id param name is assumed to follow the same pattern as the
    // other three since it wasn't independently confirmed against a live
    // request; if filtering by country doesn't actually narrow results,
    // this is the first place to check.
    let id_filters: [(&str, &str); 4] = [
        ("branch_id", filters.branch_id),
        ("agent_id", filters.agent_id),
        ("country_id", filters.country_id),
        ("institution_id", filters.institution_id),
    ];
    let mut n = 0;
    for (field_name, value) in id_filters {
        if value.is_empty() {
            continue;
        }
        params.push((format!("queryStrings[{n}][name]"), field_name.to_string()));
        params.push((format!("queryStrings[{n}][value]"), value.to_string()));
        n += 1;
    }

    // aenapply's DataTables endpoints only support GET here — a POST with
    // the same form-encoded body comes back 200 but without a `data` array,
    // so despite the large query string this has to stay GET.
    let raw = datatables_client::fetch_datatables_json(state, &section.url(), &params).await?;
    search_parser::parse_datatables_response(&raw)
}

/// Server-side filters for the `/students` DataTables endpoint — sent the
/// same way as `/offerapplications*`'s `SearchFilters`, via
/// `queryStrings[n][name]`/`queryStrings[n][value]` pairs, not as plain
/// query params.
pub struct StudentsListFilter<'a> {
    pub branch_id: &'a str,
    pub agent_id: &'a str,
    pub country_id: &'a str,
}

pub async fn search_students_list(
    state: &AppState,
    query: &str,
    start: u32,
    length: u32,
    filter: &StudentsListFilter<'_>,
) -> Result<StudentListResult, AppError> {
    auth::ensure_logged_in(state).await?;

    let mut params: Vec<(String, String)> = vec![
        ("draw".to_string(), "1".to_string()),
        ("start".to_string(), start.to_string()),
        ("length".to_string(), length.to_string()),
        ("search[value]".to_string(), query.to_string()),
    ];

    for (i, column) in STUDENTS_LIST_COLUMNS.iter().enumerate() {
        let orderable_and_searchable = *column != "action" && *column != "DT_RowIndex" && *column != "visa";
        params.push((format!("columns[{i}][data]"), column.to_string()));
        params.push((format!("columns[{i}][name]"), column.to_string()));
        params.push((
            format!("columns[{i}][searchable]"),
            orderable_and_searchable.to_string(),
        ));
        params.push((
            format!("columns[{i}][orderable]"),
            orderable_and_searchable.to_string(),
        ));
        params.push((format!("columns[{i}][search][value]"), String::new()));
        params.push((format!("columns[{i}][search][regex]"), "false".to_string()));
    }
    params.push(("order[0][column]".to_string(), "0".to_string()));
    params.push(("order[0][dir]".to_string(), "asc".to_string()));
    params.push(("order[0][name]".to_string(), "DT_RowIndex".to_string()));

    // queryStrings[n][name]/queryStrings[n][value] pairs, same as
    // /offerapplications* — see StudentsListFilter.
    let id_filters: [(&str, &str); 3] = [
        ("branch_id", filter.branch_id),
        ("agent_id", filter.agent_id),
        ("country_id", filter.country_id),
    ];
    let mut n = 0;
    for (field_name, value) in id_filters {
        if value.is_empty() {
            continue;
        }
        params.push((format!("queryStrings[{n}][name]"), field_name.to_string()));
        params.push((format!("queryStrings[{n}][value]"), value.to_string()));
        n += 1;
    }

    let raw = datatables_client::fetch_datatables_json(state, STUDENTS_LIST_URL, &params).await?;
    list_parser::parse_students_list_response(&raw)
}

/// Best-effort fetch of a student's individual applications table from
/// their `/students/show/{id}` profile page — see
/// applications_link_parser.rs for the "unverified" caveat.
pub async fn get_student_applications(
    state: &AppState,
    students_id: &str,
) -> Result<Vec<StudentApplicationLink>, AppError> {
    auth::ensure_logged_in(state).await?;

    let url = format!("{STUDENT_PROFILE_URL_BASE}/{students_id}");
    let html = state.http_client().get(&url).send().await?.text().await?;
    Ok(applications_link_parser::parse_student_applications_html(&html))
}

pub async fn get_student_detail(state: &AppState, student_id: &str) -> Result<StudentDetail, AppError> {
    auth::ensure_logged_in(state).await?;

    let url = format!("{STUDENT_DETAIL_URL_BASE}/{student_id}");
    let html = state.http_client().get(&url).send().await?.text().await?;
    detail_parser::parse_student_detail_html(&html)
}

fn filter_options_cache_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(config::app_data_dir(app)?.join(FILTER_OPTIONS_CACHE_FILE))
}

/// Deletes the on-disk filter options cache, if any. Called whenever the
/// logged-in account changes (logout, change account — see
/// `auth::logout_and_maybe_forget`/`auth::change_account`) so a newly
/// signed-in account can never see a previous one's cached Branch/Agent/
/// Country/Institution lists.
pub fn clear_filter_options_cache(app: &AppHandle) -> Result<(), AppError> {
    let path = filter_options_cache_path(app)?;
    if path.exists() {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

/// True if any of Branch/Agent/Country is empty — Institution excluded,
/// since it's expected to be empty for many roles. Doubles as both "should
/// `fetch_filter_options` try the `/students` fallback" and "is a cached
/// `FilterOptions` too incomplete to trust" (see `get_filter_options`).
fn needs_fallback(options: &FilterOptions) -> bool {
    options.branch.is_empty() || options.agent.is_empty() || options.country.is_empty()
}

/// Fills any of Branch/Agent/Country that are empty in `primary` with the
/// corresponding list from `fallback` — a per-category merge, not a
/// wholesale swap, since a restricted account might be missing only one or
/// two of these from `/offerapplications` while the rest are fine.
/// Institution is never touched: `/students` has no equivalent dropdown for
/// it, so `fallback.institution` is meaningless here.
fn merge_filter_options(mut primary: FilterOptions, fallback: FilterOptions) -> FilterOptions {
    if primary.branch.is_empty() {
        primary.branch = fallback.branch;
    }
    if primary.agent.is_empty() {
        primary.agent = fallback.agent;
    }
    if primary.country.is_empty() {
        primary.country = fallback.country;
    }
    primary
}

/// `/offerapplications` and `/students` both carry the same Branch/Agent/
/// Country `<select>` dropdowns (only `/offerapplications` also has
/// Institution) — but restricted accounts (e.g. visa officers) don't
/// necessarily get a clean 403 on `/offerapplications`; some roles get a
/// 200 whose page simply omits some of those selects. Rather than branch
/// on status code, this always parses whichever page it fetches and, if
/// any of Branch/Agent/Country came back empty, separately fetches
/// `/students` and merges in from there (see `merge_filter_options`) — a
/// 403 isn't the only way a category can end up missing. The fallback
/// fetch is best-effort (swallowed on failure): whatever the primary page
/// already had stands, rather than losing it over a failed second request.
fn log_filter_options_fetch(label: &str, url: &str, status: reqwest::StatusCode, options: &FilterOptions) {
    // Temporary diagnostic aid — same convention as the dashboard-fetch
    // logging in datatables_client.rs — for seeing exactly what a
    // restricted account's requests actually return, which we have no way
    // to verify without live credentials for that account.
    eprintln!(
        "[filter-options] {label} url={url} status={status} branch={} agent={} country={} institution={}",
        options.branch.len(),
        options.agent.len(),
        options.country.len(),
        options.institution.len(),
    );
}

async fn fetch_filter_options(state: &AppState) -> Result<FilterOptions, AppError> {
    let primary_response = state.http_client().get(STUDENTS_URL).send().await?;
    let primary_status = primary_response.status();
    let primary_html = primary_response.text().await?;
    let options = filter_options_parser::parse_filter_options_html(&primary_html);
    log_filter_options_fetch("primary", STUDENTS_URL, primary_status, &options);

    if !needs_fallback(&options) {
        return Ok(options);
    }

    eprintln!(
        "[filter-options] primary page missing branch/agent/country (branch={} agent={} country={}) — firing fallback to {STUDENTS_LIST_URL}",
        options.branch.len(),
        options.agent.len(),
        options.country.len(),
    );

    let Ok(response) = state.http_client().get(STUDENTS_LIST_URL).send().await else {
        eprintln!("[filter-options] fallback request to {STUDENTS_LIST_URL} failed (network error)");
        return Ok(options);
    };
    let fallback_status = response.status();
    let Ok(fallback_html) = response.text().await else {
        eprintln!("[filter-options] fallback body read failed (status={fallback_status})");
        return Ok(options);
    };

    let fallback = filter_options_parser::parse_filter_options_html(&fallback_html);
    log_filter_options_fetch("fallback", STUDENTS_LIST_URL, fallback_status, &fallback);
    let merged = merge_filter_options(options, fallback);
    eprintln!(
        "[filter-options] merged result: branch={} agent={} country={} institution={}",
        merged.branch.len(),
        merged.agent.len(),
        merged.country.len(),
        merged.institution.len(),
    );
    Ok(merged)
}

/// Fetches and parses the filter dropdowns (Branch, Agent, Country,
/// Institution) into id -> name mappings for the search screen's
/// server-side filter comboboxes — see `fetch_filter_options` for which
/// page(s) that comes from.
///
/// These lists rarely change, so — unlike student records, which are never
/// cached — they're read from a disk cache when one exists, skipping the
/// live fetch entirely. A fresh install (or a deleted cache file, e.g.
/// from `clear_filter_options_cache` on logout) falls back to fetching and
/// parsing live, then writes the result for next time. A cache missing
/// Branch, Agent, or Country — Institution isn't required, since it's
/// expected to be empty for many roles — is treated as not really cached,
/// so an account stuck on an incomplete result (the exact bug
/// `fetch_filter_options`'s merge fixes) gets a fresh live attempt, with
/// the fix, on its very next launch — not just after an explicit logout —
/// rather than reading the same incomplete file forever. The tradeoff: an
/// account with genuinely no Branch/Agent access from either source will
/// never see this cache "validate" and re-fetches live every launch —
/// cheap (one or two page GETs), and correct behavior beats a
/// permanently-stuck cache.
pub async fn get_filter_options(app: &AppHandle, state: &AppState) -> Result<FilterOptions, AppError> {
    let cache_path = filter_options_cache_path(app)?;
    if let Ok(raw) = std::fs::read_to_string(&cache_path) {
        if let Ok(cached) = serde_json::from_str::<FilterOptions>(&raw) {
            if !needs_fallback(&cached) {
                eprintln!(
                    "[filter-options] served from cache: branch={} agent={} country={} institution={}",
                    cached.branch.len(),
                    cached.agent.len(),
                    cached.country.len(),
                    cached.institution.len(),
                );
                return Ok(cached);
            }
            eprintln!(
                "[filter-options] cache present but incomplete (branch={} agent={} country={}) — re-fetching live",
                cached.branch.len(),
                cached.agent.len(),
                cached.country.len(),
            );
        }
    }

    auth::ensure_logged_in(state).await?;

    let options = fetch_filter_options(state).await?;

    if let Ok(raw) = serde_json::to_string_pretty(&options) {
        let _ = std::fs::write(&cache_path, raw);
    }

    Ok(options)
}

#[cfg(test)]
mod tests {
    use super::*;
    use filter_options_parser::FilterOption;

    fn option(id: &str, name: &str) -> FilterOption {
        FilterOption { id: id.to_string(), name: name.to_string() }
    }

    #[test]
    fn needs_fallback_when_branch_is_empty_even_if_others_are_not() {
        let options = FilterOptions {
            branch: vec![],
            agent: vec![option("1", "Agent One")],
            country: vec![option("1", "New Zealand")],
            institution: vec![],
        };
        assert!(needs_fallback(&options));
    }

    #[test]
    fn does_not_need_fallback_when_institution_is_the_only_empty_one() {
        // Institution has no /students equivalent, so its being empty is
        // normal and shouldn't trigger a second fetch on its own.
        let options = FilterOptions {
            branch: vec![option("1", "Branch One")],
            agent: vec![option("1", "Agent One")],
            country: vec![option("1", "New Zealand")],
            institution: vec![],
        };
        assert!(!needs_fallback(&options));
    }

    #[test]
    fn merge_fills_in_only_the_empty_categories_per_field() {
        // This is the exact bug being fixed: /offerapplications returned a
        // 200 with Country populated but Branch and Agent empty (a
        // restricted role, not a clean 403) — the merge must fill in just
        // those two from /students, not overwrite Country with whatever
        // (possibly different) list /students happens to have.
        let primary = FilterOptions {
            branch: vec![],
            agent: vec![],
            country: vec![option("1", "New Zealand")],
            institution: vec![option("9", "Victoria University")],
        };
        let fallback = FilterOptions {
            branch: vec![option("3", "Access Pokhara")],
            agent: vec![option("12", "Ramesh Gurung")],
            country: vec![option("1", "New Zealand (from /students)")],
            institution: vec![],
        };

        let merged = merge_filter_options(primary, fallback);

        assert_eq!(merged.branch, vec![option("3", "Access Pokhara")]);
        assert_eq!(merged.agent, vec![option("12", "Ramesh Gurung")]);
        // Country was already populated from the primary source — kept as-is.
        assert_eq!(merged.country, vec![option("1", "New Zealand")]);
        // Institution has no /students source and was already populated —
        // untouched either way.
        assert_eq!(merged.institution, vec![option("9", "Victoria University")]);
    }

    #[test]
    fn merge_leaves_everything_empty_if_fallback_is_also_empty() {
        let merged = merge_filter_options(FilterOptions::default(), FilterOptions::default());
        assert!(merged.branch.is_empty());
        assert!(merged.agent.is_empty());
        assert!(merged.country.is_empty());
    }
}
