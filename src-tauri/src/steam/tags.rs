const SPELLING_EXCEPTIONS: [(&str, &str); 2] = [("ui", "UI"), ("ai", "AI")];

pub fn tag_from_steam_tag(steam_tag: &str, ignored_tags: &[&str]) -> Option<String> {
    let steam_tag = steam_tag.trim();
    let is_ignored = ignored_tags
        .iter()
        .any(|ignored| steam_tag.eq_ignore_ascii_case(ignored));
    if steam_tag.is_empty() || is_ignored {
        return None;
    }
    for (exception, spelling) in SPELLING_EXCEPTIONS {
        if steam_tag.eq_ignore_ascii_case(exception) {
            return Some(spelling.to_owned());
        }
    }
    let mut letters = steam_tag.chars();
    letters
        .next()
        .map(|first| first.to_uppercase().chain(letters).collect())
}
