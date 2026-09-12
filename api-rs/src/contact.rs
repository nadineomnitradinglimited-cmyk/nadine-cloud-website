use axum::Json;
use axum::body::Bytes;
use axum::extract::{ConnectInfo, State};
use axum::http::{HeaderMap, StatusCode};
use serde::Deserialize;
use serde_json::{Value, json};
use std::net::SocketAddr;
use std::sync::Arc;

use crate::AppState;
use crate::email::send_email;
use crate::real_ip;

const MAX_BODY_BYTES: usize = 8000;

#[derive(Deserialize, Default)]
struct ContactBody {
    #[serde(default)]
    botcheck: Option<Value>,
    name: Option<String>,
    email: Option<String>,
    phone: Option<String>,
    interest: Option<String>,
    message: Option<String>,
}

fn is_truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().map(|f| f != 0.0).unwrap_or(false),
        Value::String(s) => !s.is_empty(),
        Value::Array(a) => !a.is_empty(),
        Value::Object(o) => !o.is_empty(),
    }
}

fn trunc(s: &str, max: usize) -> String {
    s.trim().chars().take(max).collect()
}

fn is_valid_email(s: &str) -> bool {
    match s.split_once('@') {
        Some((local, domain)) => !local.is_empty() && domain.contains('.') && !domain.starts_with('.'),
        None => false,
    }
}

// Mirrors contact.js exactly: same 8000-byte cap (413 if exceeded), same
// honeypot check, same field validation and email copy.
pub async fn handle_contact(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    body: Bytes,
) -> (StatusCode, Json<Value>) {
    let ip = real_ip(&headers, &addr);
    if state.contact_limiter.is_limited(&ip) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({"error": "You're sending messages too quickly — please wait a moment."})),
        );
    }

    if body.len() > MAX_BODY_BYTES {
        return (
            StatusCode::PAYLOAD_TOO_LARGE,
            Json(json!({"error": "Message too large."})),
        );
    }

    let parsed: ContactBody = match serde_json::from_slice(&body) {
        Ok(p) => p,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Invalid request."})),
            );
        }
    };

    if parsed.botcheck.as_ref().map(is_truthy).unwrap_or(false) {
        return (StatusCode::OK, Json(json!({"ok": true})));
    }

    let name = trunc(&parsed.name.unwrap_or_default(), 120);
    let email = trunc(&parsed.email.unwrap_or_default(), 200);
    let phone = trunc(&parsed.phone.unwrap_or_default(), 40);
    let interest = trunc(&parsed.interest.unwrap_or_default(), 60);
    let message = trunc(&parsed.message.unwrap_or_default(), 4000);

    if name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Name is required."})),
        );
    }
    if !is_valid_email(&email) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "A valid email is required."})),
        );
    }
    if message.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Message is required."})),
        );
    }

    let text = format!(
        "Name: {name}\nEmail: {email}\nPhone: {}\nInterested in: {}\n\n{message}",
        if phone.is_empty() { "-" } else { phone.as_str() },
        if interest.is_empty() { "-" } else { interest.as_str() },
    );

    let result = send_email(
        &state.http,
        "New enquiry from nadinecloud.com",
        &text,
        None,
        None,
    )
    .await;

    if !result.ok {
        return (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error": "Something went wrong sending that. Please try WhatsApp or email instead."})),
        );
    }

    (StatusCode::OK, Json(json!({"ok": true})))
}
