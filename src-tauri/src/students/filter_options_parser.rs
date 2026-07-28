use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterOption {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FilterOptions {
    pub branch: Vec<FilterOption>,
    pub agent: Vec<FilterOption>,
    pub country: Vec<FilterOption>,
    pub institution: Vec<FilterOption>,
}

/// Extracts `<option value="id">Name</option>` pairs from
/// `<select name="{select_name}">` on the `/offerapplications` page, e.g.
/// `<select name="branch_id"><option value="3">Access Pokhara</option>...`.
/// Options with an empty value (typically a "-- Select --" placeholder) or
/// empty text are skipped.
fn parse_select_options(document: &Html, select_name: &str) -> Vec<FilterOption> {
    let selector_str = format!("select[name='{select_name}'] option");
    let Ok(selector) = Selector::parse(&selector_str) else {
        return Vec::new();
    };
    document
        .select(&selector)
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

/// Parses the filter dropdowns (Branch, Agent, Country, Institution) from
/// the full `/offerapplications` page HTML into id -> name mappings, used to
/// populate the search screen's server-side filter comboboxes.
pub fn parse_filter_options_html(html: &str) -> FilterOptions {
    let document = Html::parse_document(html);
    FilterOptions {
        branch: parse_select_options(&document, "branch_id"),
        agent: parse_select_options(&document, "agent_id"),
        country: parse_select_options(&document, "country_id"),
        institution: parse_select_options(&document, "institution_id"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE_HTML: &str = r#"
        <html><body>
          <select name="branch_id">
            <option value="">-- Select Branch --</option>
            <option value="3">Access Pokhara</option>
            <option value="7">Access Baneshwor</option>
          </select>
          <select name="agent_id">
            <option value="">-- Select Agent --</option>
            <option value="12">Ramesh Gurung</option>
          </select>
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
    fn parses_all_four_dropdowns() {
        let options = parse_filter_options_html(FIXTURE_HTML);

        assert_eq!(options.branch.len(), 2);
        assert_eq!(options.branch[0].id, "3");
        assert_eq!(options.branch[0].name, "Access Pokhara");
        assert_eq!(options.branch[1].id, "7");
        assert_eq!(options.branch[1].name, "Access Baneshwor");

        assert_eq!(options.agent.len(), 1);
        assert_eq!(options.agent[0].id, "12");
        assert_eq!(options.agent[0].name, "Ramesh Gurung");

        assert_eq!(options.country.len(), 2);
        assert_eq!(options.country[0].name, "New Zealand");

        assert_eq!(options.institution.len(), 1);
        assert_eq!(options.institution[0].id, "45");
        assert_eq!(options.institution[0].name, "Victoria University of Wellington");
    }

    #[test]
    fn skips_placeholder_option_with_empty_value() {
        let options = parse_filter_options_html(FIXTURE_HTML);
        assert!(options.branch.iter().all(|o| !o.id.is_empty()));
        assert!(options.branch.iter().all(|o| o.name != "-- Select Branch --"));
    }

    #[test]
    fn degrades_gracefully_when_selects_are_missing() {
        let options = parse_filter_options_html("<html><body>Nothing here.</body></html>");
        assert!(options.branch.is_empty());
        assert!(options.agent.is_empty());
        assert!(options.country.is_empty());
        assert!(options.institution.is_empty());
    }
}
