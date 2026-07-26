use std::path::{Path, PathBuf};

const ILLEGAL_WINDOWS_CHARS: &[char] = &['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
const RESERVED_NAMES: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// Sanitizes a single path component for use on Windows: replaces illegal
/// characters and control characters, trims trailing dots/spaces (illegal on
/// Windows), and escapes reserved device names.
pub fn sanitize_component(input: &str) -> String {
    let mut s: String = input
        .chars()
        .map(|c| {
            if ILLEGAL_WINDOWS_CHARS.contains(&c) || (c as u32) < 32 {
                '_'
            } else {
                c
            }
        })
        .collect();

    s = s.trim().trim_end_matches('.').trim().to_string();

    if s.is_empty() {
        s = "Unnamed".to_string();
    }

    if RESERVED_NAMES.iter().any(|r| r.eq_ignore_ascii_case(&s)) {
        s.push('_');
    }

    s
}

/// Builds the output path for a student's documents:
/// {base}/{Country}/{Branch, "Access " prefix stripped}/{Student}/{University}/
pub fn build_output_path(base: &Path, country: &str, branch: &str, student: &str, university: &str) -> PathBuf {
    let branch_stripped = branch.strip_prefix("Access ").unwrap_or(branch);
    base.join(sanitize_component(country))
        .join(sanitize_component(branch_stripped))
        .join(sanitize_component(student))
        .join(sanitize_component(university))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_illegal_characters() {
        assert_eq!(sanitize_component("A/B\\C:D*E?F\"G<H>I|J"), "A_B_C_D_E_F_G_H_I_J");
    }

    #[test]
    fn trims_trailing_dots_and_spaces() {
        assert_eq!(sanitize_component("Some Name.. "), "Some Name");
    }

    #[test]
    fn falls_back_to_unnamed_when_empty() {
        assert_eq!(sanitize_component("   "), "Unnamed");
        assert_eq!(sanitize_component(""), "Unnamed");
    }

    #[test]
    fn escapes_reserved_device_names() {
        assert_eq!(sanitize_component("CON"), "CON_");
        assert_eq!(sanitize_component("com3"), "com3_");
        assert_eq!(sanitize_component("Constantinople"), "Constantinople");
    }

    #[test]
    fn strips_access_prefix_from_branch() {
        let path = build_output_path(
            Path::new("C:/Output"),
            "Nepal",
            "Access Kathmandu",
            "Jane Doe",
            "University of Melbourne",
        );
        assert_eq!(
            path,
            Path::new("C:/Output/Nepal/Kathmandu/Jane Doe/University of Melbourne")
        );
    }

    #[test]
    fn leaves_branch_unchanged_when_no_access_prefix() {
        let path = build_output_path(
            Path::new("C:/Output"),
            "Nepal",
            "Kathmandu",
            "Jane Doe",
            "University of Melbourne",
        );
        assert_eq!(
            path,
            Path::new("C:/Output/Nepal/Kathmandu/Jane Doe/University of Melbourne")
        );
    }
}
