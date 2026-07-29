use scraper::Html;

/// Decodes the small set of HTML entities aenapply's encoded fields use,
/// e.g. `&lt;span&gt;` for a literal `<span>`.
pub fn decode_html_entities(input: &str) -> String {
    input
        .replace("&quot;", "\"")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .replace("&amp;", "&")
}

/// Some DataTables fields (e.g. `progress_status_name`, `status_name`)
/// arrive HTML-encoded, e.g.
/// `&lt;span class=&quot;fw-meduim text-info&quot;&gt;Document Submitted&lt;/span&gt;`.
/// Decodes the entities and strips all tags, keeping only the plain text.
pub fn decode_and_strip_tags(raw: &str) -> String {
    let decoded = decode_html_entities(raw);
    Html::parse_fragment(&decoded)
        .root_element()
        .text()
        .collect::<String>()
        .trim()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_tags_and_decodes_entities() {
        let raw = "&lt;span class=&quot;fw-meduim text-info&quot;&gt;Document Submitted&lt;/span&gt;";
        assert_eq!(decode_and_strip_tags(raw), "Document Submitted");
    }
}
