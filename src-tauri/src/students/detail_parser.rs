use crate::errors::AppError;
use crate::rename_rules;
use scraper::{Html, Selector};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct DetailDocEntry {
    /// The document's label from the gallery link's `data-caption` attribute
    /// (e.g. "LOR") — aenapply.com's fancybox gallery uses this as a human
    /// label, not the underlying stored filename.
    pub name: String,
    /// The document's storage URL (`href` on the same `<a>` tag).
    pub url: String,
    /// The last path segment of `url` (e.g. "prabin_dhakal_lor_3.pdf") — this
    /// is the actual filename the ZIP archive uses, and is the key the
    /// staff's rename-dropdown selection is matched against during download
    /// (the display `name` above never appears in the ZIP).
    pub filename: String,
    /// A best-effort keyword-matched category to pre-select in the rename
    /// dropdown; `None` if nothing matched (UI defaults to "Manually Rename").
    pub suggested_category: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StudentDetail {
    pub documents: Vec<DetailDocEntry>,
}

/// Matches the fancybox gallery links inside the `#documents` tab, e.g.
/// `<div class="document-list"><div class="hstack"><div class="d-flex">
///   <a data-fancybox="gallery" data-caption="LOR" href="https://aenapply.com/storage/.../lor_3.pdf">...</a>
/// </div></div></div>`.
const SELECTOR_DOCUMENT_LINK: &str =
    "div.document-list > div.hstack > div.d-flex a[data-fancybox='gallery']";

/// Parses the `#documents` tab section of the student detail page HTML.
/// Student profile info (name, branch, country, university, program) is
/// intentionally not scraped here — it isn't present on this page and is
/// passed through from the search results' `StudentSummary` instead.
pub fn parse_student_detail_html(html: &str) -> Result<StudentDetail, AppError> {
    let document = Html::parse_fragment(html);

    let mut documents = Vec::new();
    if let Ok(selector) = Selector::parse(SELECTOR_DOCUMENT_LINK) {
        for link in document.select(&selector) {
            let name = link.value().attr("data-caption").unwrap_or_default().trim().to_string();
            let url = link.value().attr("href").unwrap_or_default().to_string();
            if name.is_empty() {
                continue;
            }

            let filename = url.rsplit('/').next().unwrap_or_default().to_string();
            let suggested_category = rename_rules::classify(&name).map(|c| c.to_string());
            documents.push(DetailDocEntry {
                name,
                url,
                filename,
                suggested_category,
            });
        }
    }

    Ok(StudentDetail { documents })
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE_HTML: &str = r#"
        <div id="documents">
          <div class="document-list">
            <div class="hstack">
              <div class="d-flex">
                <a data-fancybox="gallery" data-caption="Passport" href="https://aenapply.com/storage/docs/passport_1.pdf">
                  <img src="thumb1.png">
                </a>
              </div>
            </div>
            <div class="hstack">
              <div class="d-flex">
                <a data-fancybox="gallery" data-caption="LOR" href="https://aenapply.com/storage/docs/lor_3.pdf">
                  <img src="thumb2.png">
                </a>
              </div>
            </div>
            <div class="hstack">
              <div class="d-flex">
                <a data-fancybox="gallery" data-caption="Random Unrelated File" href="https://aenapply.com/storage/docs/misc_1.pdf">
                  <img src="thumb3.png">
                </a>
              </div>
            </div>
          </div>
        </div>
    "#;

    #[test]
    fn parses_document_links_with_caption_and_url() {
        let detail = parse_student_detail_html(FIXTURE_HTML).unwrap();
        assert_eq!(detail.documents.len(), 3);

        let passport = &detail.documents[0];
        assert_eq!(passport.name, "Passport");
        assert_eq!(passport.url, "https://aenapply.com/storage/docs/passport_1.pdf");
        assert_eq!(passport.filename, "passport_1.pdf");
        assert_eq!(passport.suggested_category.as_deref(), Some("Passport"));

        let lor = &detail.documents[1];
        assert_eq!(lor.name, "LOR");
        assert_eq!(lor.filename, "lor_3.pdf");
        assert_eq!(lor.suggested_category.as_deref(), Some("Recommendation Letter"));

        // Unrecognized names are still listed (raw), just with no suggestion.
        let unrelated = &detail.documents[2];
        assert_eq!(unrelated.name, "Random Unrelated File");
        assert_eq!(unrelated.suggested_category, None);
    }

    #[test]
    fn filename_is_derived_from_url_not_display_name() {
        // Real-world case: the display name bears no resemblance to the
        // actual stored filename, so the two must never be conflated.
        let html = r#"
            <div class="document-list"><div class="hstack"><div class="d-flex">
              <a data-fancybox="gallery" data-caption="Visa Copy"
                 href="https://aenapply.com/storage/access/uploads/offerapplications/prabin_dhakal_prabin_visa_485.pdf">
              </a>
            </div></div></div>
        "#;
        let detail = parse_student_detail_html(html).unwrap();
        assert_eq!(detail.documents.len(), 1);
        assert_eq!(detail.documents[0].name, "Visa Copy");
        assert_eq!(detail.documents[0].filename, "prabin_dhakal_prabin_visa_485.pdf");
    }

    #[test]
    fn degrades_gracefully_when_selector_matches_nothing() {
        let detail = parse_student_detail_html("<div>Nothing here.</div>").unwrap();
        assert!(detail.documents.is_empty());
    }
}
