use axum::Json;
use axum::extract::{ConnectInfo, Query, State};
use axum::http::{HeaderMap, StatusCode};
use serde::Deserialize;
use serde_json::{Value, json};
use std::net::SocketAddr;
use std::sync::Arc;

use crate::AppState;
use crate::real_ip;

// Mirrors namecheap.js exactly: same TLD set, same sanitization, same
// sandbox/production URL switch, same "ClientIp must match real outbound
// IP" workaround via ipify.

const TLDS: [&str; 3] = ["com", "net", "org"];

fn is_configured() -> bool {
    std::env::var("NAMECHEAP_API_KEY").is_ok()
        && std::env::var("NAMECHEAP_API_USER").is_ok()
        && std::env::var("NAMECHEAP_USERNAME").is_ok()
}

fn base_url() -> &'static str {
    if std::env::var("NAMECHEAP_SANDBOX").as_deref() == Ok("true") {
        "https://api.sandbox.namecheap.com/xml.response"
    } else {
        "https://api.namecheap.com/xml.response"
    }
}

async fn get_outbound_ip(client: &reqwest::Client) -> Result<String, String> {
    let res = client
        .get("https://api.ipify.org?format=text")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err("Could not determine outbound IP".into());
    }
    Ok(res.text().await.map_err(|e| e.to_string())?.trim().to_string())
}

pub struct DomainResult {
    pub domain: String,
    pub available: bool,
    pub is_premium: bool,
    pub premium_price: Option<String>,
}

pub async fn check_availability(
    client: &reqwest::Client,
    domain_names: &[String],
) -> Result<Vec<DomainResult>, String> {
    if !is_configured() {
        return Err("NAMECHEAP_NOT_CONFIGURED".into());
    }
    let client_ip = get_outbound_ip(client).await?;
    tracing::info!("Namecheap request using ClientIp={client_ip}");
    let api_user = std::env::var("NAMECHEAP_API_USER").unwrap();
    let api_key = std::env::var("NAMECHEAP_API_KEY").unwrap();
    let username = std::env::var("NAMECHEAP_USERNAME").unwrap();
    let domain_list = domain_names.join(",");

    let res = client
        .get(base_url())
        .query(&[
            ("ApiUser", api_user.as_str()),
            ("ApiKey", api_key.as_str()),
            ("UserName", username.as_str()),
            ("ClientIp", client_ip.as_str()),
            ("Command", "namecheap.domains.check"),
            ("DomainList", domain_list.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let xml = res.text().await.map_err(|e| e.to_string())?;
    let doc = roxmltree::Document::parse(&xml).map_err(|e| e.to_string())?;

    let api_response = doc
        .descendants()
        .find(|n| n.has_tag_name("ApiResponse"))
        .ok_or_else(|| "Unexpected response from Namecheap API".to_string())?;

    let status = api_response.attribute("Status").unwrap_or("");
    if status == "ERROR" {
        let msg = doc
            .descendants()
            .filter(|n| n.has_tag_name("Error"))
            .filter_map(|n| n.text())
            .collect::<Vec<_>>()
            .join("; ");
        return Err(if msg.is_empty() {
            "Unknown Namecheap API error".to_string()
        } else {
            msg
        });
    }

    Ok(doc
        .descendants()
        .filter(|n| n.has_tag_name("DomainCheckResult"))
        .map(|n| DomainResult {
            domain: n.attribute("Domain").unwrap_or("").to_string(),
            available: n.attribute("Available") == Some("true"),
            is_premium: n.attribute("IsPremiumName") == Some("true"),
            premium_price: n
                .attribute("PremiumRegistrationPrice")
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string()),
        })
        .collect())
}

#[derive(Deserialize)]
pub struct DomainCheckQuery {
    name: Option<String>,
}

pub async fn handle_domain_check(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Query(params): Query<DomainCheckQuery>,
) -> (StatusCode, Json<Value>) {
    let ip = real_ip(&headers, &addr);
    if state.domain_check_limiter.is_limited(&ip) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(
                json!({"error": "You're checking too quickly — please wait a moment and try again."}),
            ),
        );
    }

    let raw = params.name.unwrap_or_default().trim().to_lowercase();
    let name: String = raw
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-')
        .collect();
    if name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Missing domain name."})),
        );
    }

    if !is_configured() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({"error": "Live domain checking isn’t switched on yet."})),
        );
    }

    let domains: Vec<String> = TLDS.iter().map(|tld| format!("{name}.{tld}")).collect();
    match check_availability(&state.http, &domains).await {
        Ok(results) => {
            let json_results: Vec<Value> = results
                .into_iter()
                .map(|r| {
                    json!({
                        "domain": r.domain,
                        "available": r.available,
                        "isPremium": r.is_premium,
                        "premiumPrice": r.premium_price,
                    })
                })
                .collect();
            (StatusCode::OK, Json(json!({"results": json_results})))
        }
        Err(err) => {
            tracing::error!("Namecheap domain check error: {err}");
            (
                StatusCode::BAD_GATEWAY,
                Json(json!({"error": "Could not check that domain right now — please try again."})),
            )
        }
    }
}
