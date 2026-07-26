use reqwest::Client;

pub fn build_client() -> Client {
    Client::builder()
        .cookie_store(true)
        .build()
        .expect("failed to build HTTP client")
}
