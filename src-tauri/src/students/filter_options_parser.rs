use scraper::{ElementRef, Html, Selector};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FilterOption {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct FilterOptions {
    pub branch: Vec<FilterOption>,
    pub agent: Vec<FilterOption>,
    pub country: Vec<FilterOption>,
    pub institution: Vec<FilterOption>,
}

/// Extracts `<option value="id">Name</option>` pairs from within an
/// already-located `<select>` element. Options with an empty value
/// (typically a "-- Select --" placeholder) or empty text are skipped.
fn parse_options_within(select: ElementRef) -> Vec<FilterOption> {
    let Ok(option_selector) = Selector::parse("option") else {
        return Vec::new();
    };
    select
        .select(&option_selector)
        .filter_map(|opt| {
            let id = opt.value().attr("value").unwrap_or("").trim().to_string();
            let name = opt.text().collect::<String>().trim().to_string();
            if id.is_empty() || name.is_empty() {
                return None;
            }
            Some(FilterOption { id, name })
        })
        .collect()
}

/// Finds `<select name="{select_name}">` and extracts its options — used
/// only for Country and Institution, which really are `<select>` elements
/// (confirmed via raw HTML logging). Branch and Agent are NOT selects —
/// see `parse_anchor_options`.
fn parse_select_options(document: &Html, select_name: &str) -> Vec<FilterOption> {
    let Ok(selector) = Selector::parse(&format!("select[name='{select_name}']")) else {
        return Vec::new();
    };
    document.select(&selector).next().map(parse_options_within).unwrap_or_default()
}

/// Pulls `key`'s value out of `href`'s query string, e.g.
/// `extract_query_param("/students?branch_id=1&x=2", "branch_id") ==
/// Some("1")`. Works for both relative (`/students?...`) and absolute
/// (`https://aenapply.com/students?...`) hrefs, and regardless of the
/// param's position, since only the substring after `?` is inspected and
/// each `&`-separated pair is checked independently.
fn extract_query_param(href: &str, key: &str) -> Option<String> {
    let query = href.split('?').nth(1)?;
    query.split('&').find_map(|pair| {
        let mut parts = pair.splitn(2, '=');
        let k = parts.next()?;
        let v = parts.next().unwrap_or("");
        (k == key).then(|| v.trim().to_string())
    })
}

/// Extracts Branch/Agent options from sidebar links shaped like
/// `<a href="/students?branch_id=1">Access Baneshwor</a>` — confirmed via
/// raw HTML logging (see `students::fetch_filter_options`) to be how
/// aenapply actually renders these on both `/offerapplications` and
/// `/students`; there is no `<select name="branch_id">`/`"agent_id"` on
/// either page, despite Country genuinely being one. `query_param` is the
/// href query key to read the id from (`"branch_id"` or `"agent_id"`).
/// Dedupes by id, since the same link can plausibly appear more than once
/// in a page's markup (e.g. a highlighted/duplicated "current" entry).
fn parse_anchor_options(document: &Html, query_param: &str) -> Vec<FilterOption> {
    let Ok(selector) = Selector::parse(&format!("a[href*='{query_param}']")) else {
        return Vec::new();
    };
    let mut seen = HashSet::new();
    document
        .select(&selector)
        .filter_map(|anchor| {
            let href = anchor.value().attr("href")?;
            let id = extract_query_param(href, query_param)?;
            let name = anchor.text().collect::<String>().trim().to_string();
            if id.is_empty() || name.is_empty() || !seen.insert(id.clone()) {
                return None;
            }
            Some(FilterOption { id, name })
        })
        .collect()
}

/// Parses the filter lists (Branch, Agent, Country, Institution) from an
/// aenapply page's HTML into id -> name mappings, used to populate the
/// search screen's server-side filter comboboxes. Branch and Agent come
/// from sidebar anchor links (`parse_anchor_options`); Country and
/// Institution are genuine `<select>` elements (`parse_select_options`).
/// Used for both the full `/offerapplications` page and, as a fallback for
/// accounts that get a 403 there, `/students` (Branch/Agent/Country only —
/// `/students` has no Institution list — see
/// `students::fetch_filter_options` for the merge).
pub fn parse_filter_options_html(html: &str) -> FilterOptions {
    let document = Html::parse_document(html);
    FilterOptions {
        branch: parse_anchor_options(&document, "branch_id"),
        agent: parse_anchor_options(&document, "agent_id"),
        country: parse_select_options(&document, "country_id"),
        institution: parse_select_options(&document, "institution_id"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE_HTML: &str = r#"
        <html><body>
          <nav>
            <a href="/students?branch_id=1">Access Baneshwor</a>
            <a href="/students?branch_id=3">Access Pokhara</a>
            <a href="/offerapplications?agent_id=8">Grace International - Butwal</a>
          </nav>
          <select name="country_id">
            <option value="">-- Select Country --</option>
            <option value="1">New Zealand</option>
            <option value="2">Australia</option>
          </select>
          <select name="institution_id">
            <option value="">-- Select Institution --</option>
            <option value="45">Victoria University of Wellington</option>
          </select>
        </body></html>
    "#;

    #[test]
    fn parses_branch_and_agent_from_anchor_links() {
        let options = parse_filter_options_html(FIXTURE_HTML);

        assert_eq!(
            options.branch,
            vec![
                FilterOption { id: "1".to_string(), name: "Access Baneshwor".to_string() },
                FilterOption { id: "3".to_string(), name: "Access Pokhara".to_string() },
            ]
        );
        assert_eq!(
            options.agent,
            vec![FilterOption { id: "8".to_string(), name: "Grace International - Butwal".to_string() }]
        );
    }

    #[test]
    fn parses_country_and_institution_from_selects() {
        let options = parse_filter_options_html(FIXTURE_HTML);

        assert_eq!(options.country.len(), 2);
        assert_eq!(options.country[0].id, "1");
        assert_eq!(options.country[0].name, "New Zealand");

        assert_eq!(options.institution.len(), 1);
        assert_eq!(options.institution[0].id, "45");
        assert_eq!(options.institution[0].name, "Victoria University of Wellington");
    }

    #[test]
    fn dedupes_repeated_branch_links() {
        let html = r#"
            <a href="/students?branch_id=1">Access Baneshwor</a>
            <a href="/students?branch_id=1">Access Baneshwor</a>
        "#;
        let options = parse_filter_options_html(html);
        assert_eq!(options.branch.len(), 1);
    }

    #[test]
    fn ignores_links_without_the_query_param() {
        let html = r#"
            <a href="/students?country_id=1">New Zealand</a>
            <a href="/offerapplications/applied">Offer Applied</a>
        "#;
        let options = parse_filter_options_html(html);
        assert!(options.branch.is_empty());
        assert!(options.agent.is_empty());
    }

    #[test]
    fn handles_absolute_hrefs_and_extra_query_params() {
        let html = r#"
            <a href="https://aenapply.com/students?tab=list&branch_id=7&sort=asc">Access Chitwan</a>
        "#;
        let options = parse_filter_options_html(html);
        assert_eq!(options.branch, vec![FilterOption { id: "7".to_string(), name: "Access Chitwan".to_string() }]);
    }

    #[test]
    fn skips_placeholder_option_with_empty_value() {
        let options = parse_filter_options_html(FIXTURE_HTML);
        assert!(options.country.iter().all(|o| !o.id.is_empty()));
        assert!(options.country.iter().all(|o| o.name != "-- Select Country --"));
    }

    #[test]
    fn degrades_gracefully_when_nothing_matches() {
        let options = parse_filter_options_html("<html><body>Nothing here.</body></html>");
        assert!(options.branch.is_empty());
        assert!(options.agent.is_empty());
        assert!(options.country.is_empty());
        assert!(options.institution.is_empty());
    }
}
