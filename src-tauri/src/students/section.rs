use crate::errors::AppError;

/// One of the 7 aenapply.com application-list views reachable from the
/// sidebar. Each has its own URL path suffix off `/offerapplications` and
/// its own DataTables `columns[]` shape — the server keys its response off
/// the requested columns, so sending the wrong set for a given view returns
/// the wrong (or missing) data.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Section {
    Applications,
    Applied,
    Issued,
    Processing,
    Withdrawn,
    Rejected,
    Granted,
}

impl Section {
    /// Parses the sidebar's section key (see `SECTIONS` in the frontend's
    /// `src/constants.ts`, which must stay in sync with these strings).
    pub fn from_key(key: &str) -> Result<Self, AppError> {
        Ok(match key {
            "applications" => Section::Applications,
            "applied" => Section::Applied,
            "issued" => Section::Issued,
            "processing" => Section::Processing,
            "withdrawn" => Section::Withdrawn,
            "rejected" => Section::Rejected,
            "granted" => Section::Granted,
            other => return Err(AppError::Other(format!("unknown section '{other}'"))),
        })
    }

    fn path_suffix(self) -> &'static str {
        match self {
            Section::Applications => "",
            Section::Applied => "/applied",
            Section::Issued => "/issued",
            Section::Processing => "/processing",
            Section::Withdrawn => "/withdrawn",
            Section::Rejected => "/rejected",
            Section::Granted => "/granted",
        }
    }

    pub fn url(self) -> String {
        format!("https://aenapply.com/offerapplications{}", self.path_suffix())
    }

    /// The exact `columns[]` this view's DataTables endpoint expects, in
    /// order. `student` is always column 0, matching the
    /// `order[0][column]=0` / `order[0][name]=student` sent on every
    /// request regardless of section.
    pub fn columns(self) -> &'static [&'static str] {
        match self {
            Section::Applications => &["student", "program", "processing_fee", "status", "action"],
            Section::Applied => &[
                "student",
                "program",
                "processing_fee",
                "expected_offer_date",
                "offer",
                "status",
                "action",
            ],
            Section::Issued => {
                &["student", "program", "offer_letter", "enrollment", "status", "action"]
            }
            Section::Processing => {
                &["student", "program", "offer_letter", "status", "enrollment", "action"]
            }
            Section::Withdrawn => {
                &["student", "program", "offer_letter", "status", "enrollment", "action"]
            }
            Section::Rejected => {
                &["student", "program", "offer_letter", "status", "enrollment", "action"]
            }
            Section::Granted => {
                &["student", "program", "offer_letter", "status", "commencement", "action"]
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_all_seven_keys() {
        for key in [
            "applications",
            "applied",
            "issued",
            "processing",
            "withdrawn",
            "rejected",
            "granted",
        ] {
            assert!(Section::from_key(key).is_ok(), "expected '{key}' to parse");
        }
    }

    #[test]
    fn rejects_unknown_key() {
        assert!(Section::from_key("bogus").is_err());
    }

    #[test]
    fn applications_url_has_no_suffix() {
        assert_eq!(Section::Applications.url(), "https://aenapply.com/offerapplications");
    }

    #[test]
    fn applied_url_has_suffix() {
        assert_eq!(Section::Applied.url(), "https://aenapply.com/offerapplications/applied");
    }

    #[test]
    fn student_is_always_column_zero() {
        for section in [
            Section::Applications,
            Section::Applied,
            Section::Issued,
            Section::Processing,
            Section::Withdrawn,
            Section::Rejected,
            Section::Granted,
        ] {
            assert_eq!(section.columns()[0], "student");
        }
    }
}
