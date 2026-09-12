use axum::Json;
use axum::body::Bytes;
use axum::extract::{ConnectInfo, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqlx::Row;
use std::net::SocketAddr;
use std::sync::Arc;

use crate::AppState;
use crate::rate_limit::RateLimiter;
use crate::real_ip;

const SESSION_COOKIE: &str = "nc_session";
const SESSION_TTL_SECS: i64 = 30 * 24 * 60 * 60; // 30 days, matches auth.js
const MAX_BODY_BYTES: usize = 10_000;

// scrypt N=16384 (log2=14), r=8, p=1, 64-byte output — Node's crypto.scrypt
// defaults exactly. Stored as "<salt-hex>:<derived-key-hex>", same custom
// format as auth.js (not the PHC/MCF string format), so either service can
// verify a password hashed by the other.
fn hash_password(password: &str) -> String {
    let mut salt_bytes = [0u8; 16];
    getrandom::fill(&mut salt_bytes).expect("system RNG unavailable");
    let salt_hex = hex::encode(salt_bytes);
    let mut output = [0u8; 64];
    let params = scrypt::Params::new(14, 8, 1).expect("valid scrypt params");
    scrypt::scrypt(password.as_bytes(), salt_hex.as_bytes(), &params, &mut output)
        .expect("scrypt hashing failed");
    format!("{salt_hex}:{}", hex::encode(output))
}

fn verify_password(password: &str, stored: &str) -> bool {
    let Some((salt_hex, hash_hex)) = stored.split_once(':') else {
        return false;
    };
    let Ok(expected) = hex::decode(hash_hex) else {
        return false;
    };
    let mut output = vec![0u8; expected.len()];
    let Ok(params) = scrypt::Params::new(14, 8, 1) else {
        return false;
    };
    if scrypt::scrypt(password.as_bytes(), salt_hex.as_bytes(), &params, &mut output).is_err() {
        return false;
    }
    // constant-time comparison, matching crypto.timingSafeEqual
    use subtle::ConstantTimeEq;
    output.ct_eq(&expected).into()
}

fn parse_cookies(headers: &HeaderMap) -> std::collections::HashMap<String, String> {
    let mut out = std::collections::HashMap::new();
    if let Some(raw) = headers.get(header::COOKIE).and_then(|v| v.to_str().ok()) {
        for part in raw.split(';') {
            if let Some((k, v)) = part.split_once('=') {
                out.insert(k.trim().to_string(), v.trim().to_string());
            }
        }
    }
    out
}

fn session_cookie_header(token: Option<&str>, max_age_secs: i64) -> HeaderValue {
    let value = match token {
        None => format!("{SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0"),
        Some(t) => format!(
            "{SESSION_COOKIE}={t}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age={max_age_secs}"
        ),
    };
    HeaderValue::from_str(&value).unwrap()
}

async fn create_session(db: &sqlx::PgPool, user_id: i32) -> Result<String, sqlx::Error> {
    let mut token_bytes = [0u8; 32];
    getrandom::fill(&mut token_bytes).expect("system RNG unavailable");
    let token = hex::encode(token_bytes);
    let expires_at = Utc::now() + chrono::Duration::seconds(SESSION_TTL_SECS);
    sqlx::query("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)")
        .bind(&token)
        .bind(user_id)
        .bind(expires_at)
        .execute(db)
        .await?;
    Ok(token)
}

#[derive(Serialize)]
struct UserOut {
    id: i32,
    name: String,
    email: String,
}

async fn get_session_user(db: &sqlx::PgPool, headers: &HeaderMap) -> Option<UserOut> {
    let cookies = parse_cookies(headers);
    let token = cookies.get(SESSION_COOKIE)?;
    let row = sqlx::query(
        "SELECT u.id, u.name, u.email FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = $1 AND s.expires_at > now()",
    )
    .bind(token)
    .fetch_optional(db)
    .await
    .ok()??;
    Some(UserOut {
        id: row.try_get("id").ok()?,
        name: row.try_get("name").ok()?,
        email: row.try_get("email").ok()?,
    })
}

fn is_valid_email(s: &str) -> bool {
    match s.split_once('@') {
        Some((local, domain)) => !local.is_empty() && domain.contains('.') && !domain.starts_with('.'),
        None => false,
    }
}

fn ip_rate_limited(limiter: &RateLimiter, headers: &HeaderMap, addr: &SocketAddr) -> bool {
    // auth.js only ever looked at req.socket.remoteAddress, never
    // X-Forwarded-For — but every request now arrives via server.js's
    // internal proxy either way, so using the same X-Forwarded-For-aware
    // real_ip() helper as the rest of this service actually reflects the
    // true visitor IP (what auth.js's version was implicitly trying, but
    // couldn't, running standalone) rather than the proxy's own address.
    limiter.is_limited(&real_ip(headers, addr))
}

#[derive(Deserialize, Default)]
struct SignupBody {
    name: Option<String>,
    email: Option<String>,
    password: Option<String>,
}

pub async fn handle_signup(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    body: Bytes,
) -> (StatusCode, HeaderMap, Json<Value>) {
    let Some(db) = &state.db else {
        return json_res(StatusCode::SERVICE_UNAVAILABLE, None, json!({"error": "Accounts aren’t set up yet — please check back soon."}));
    };
    if ip_rate_limited(&state.auth_limiter, &headers, &addr) {
        return json_res(StatusCode::TOO_MANY_REQUESTS, None, json!({"error": "Too many attempts — please wait a moment and try again."}));
    }
    if body.len() > MAX_BODY_BYTES {
        return json_res(StatusCode::BAD_REQUEST, None, json!({"error": "Invalid request."}));
    }
    let parsed: SignupBody = match serde_json::from_slice(&body) {
        Ok(p) => p,
        Err(_) => return json_res(StatusCode::BAD_REQUEST, None, json!({"error": "Invalid request."})),
    };

    let name: String = parsed.name.unwrap_or_default().trim().chars().take(120).collect();
    let email: String = parsed.email.unwrap_or_default().trim().to_lowercase().chars().take(200).collect();
    let password = parsed.password.unwrap_or_default();

    if name.is_empty() {
        return json_res(StatusCode::BAD_REQUEST, None, json!({"error": "Name is required."}));
    }
    if !is_valid_email(&email) {
        return json_res(StatusCode::BAD_REQUEST, None, json!({"error": "A valid email is required."}));
    }
    if password.chars().count() < 8 {
        return json_res(StatusCode::BAD_REQUEST, None, json!({"error": "Password must be at least 8 characters."}));
    }

    let existing = sqlx::query("SELECT id FROM users WHERE email = $1").bind(&email).fetch_optional(db).await;
    match existing {
        Ok(Some(_)) => return json_res(StatusCode::CONFLICT, None, json!({"error": "An account with that email already exists — try logging in instead."})),
        Err(err) => {
            tracing::error!("Signup lookup error: {err}");
            return json_res(StatusCode::INTERNAL_SERVER_ERROR, None, json!({"error": "Could not create your account — please try again."}));
        }
        Ok(None) => {}
    }

    let password_hash = hash_password(&password);
    let inserted = sqlx::query(
        "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
    )
    .bind(&name)
    .bind(&email)
    .bind(&password_hash)
    .fetch_one(db)
    .await;

    let row = match inserted {
        Ok(r) => r,
        Err(err) => {
            tracing::error!("Signup insert error: {err}");
            return json_res(StatusCode::INTERNAL_SERVER_ERROR, None, json!({"error": "Could not create your account — please try again."}));
        }
    };
    let user = UserOut {
        id: row.get("id"),
        name: row.get("name"),
        email: row.get("email"),
    };

    match create_session(db, user.id).await {
        Ok(token) => json_res(StatusCode::OK, Some(session_cookie_header(Some(&token), SESSION_TTL_SECS)), json!({"user": user})),
        Err(err) => {
            tracing::error!("Signup session error: {err}");
            json_res(StatusCode::INTERNAL_SERVER_ERROR, None, json!({"error": "Could not create your account — please try again."}))
        }
    }
}

#[derive(Deserialize, Default)]
struct LoginBody {
    email: Option<String>,
    password: Option<String>,
}

pub async fn handle_login(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    body: Bytes,
) -> (StatusCode, HeaderMap, Json<Value>) {
    let Some(db) = &state.db else {
        return json_res(StatusCode::SERVICE_UNAVAILABLE, None, json!({"error": "Accounts aren’t set up yet — please check back soon."}));
    };
    if ip_rate_limited(&state.auth_limiter, &headers, &addr) {
        return json_res(StatusCode::TOO_MANY_REQUESTS, None, json!({"error": "Too many attempts — please wait a moment and try again."}));
    }
    if body.len() > MAX_BODY_BYTES {
        return json_res(StatusCode::BAD_REQUEST, None, json!({"error": "Invalid request."}));
    }
    let parsed: LoginBody = match serde_json::from_slice(&body) {
        Ok(p) => p,
        Err(_) => return json_res(StatusCode::BAD_REQUEST, None, json!({"error": "Invalid request."})),
    };

    let email: String = parsed.email.unwrap_or_default().trim().to_lowercase().chars().take(200).collect();
    let password = parsed.password.unwrap_or_default();
    if email.is_empty() || password.is_empty() {
        return json_res(StatusCode::BAD_REQUEST, None, json!({"error": "Email and password are required."}));
    }

    let result = sqlx::query("SELECT id, name, email, password_hash FROM users WHERE email = $1")
        .bind(&email)
        .fetch_optional(db)
        .await;

    let row = match result {
        Ok(r) => r,
        Err(err) => {
            tracing::error!("Login lookup error: {err}");
            return json_res(StatusCode::INTERNAL_SERVER_ERROR, None, json!({"error": "Could not log you in — please try again."}));
        }
    };

    let valid_row = row.as_ref().filter(|r| {
        let stored: String = r.try_get("password_hash").unwrap_or_default();
        verify_password(&password, &stored)
    });

    let Some(row) = valid_row else {
        return json_res(StatusCode::UNAUTHORIZED, None, json!({"error": "Incorrect email or password."}));
    };

    let user = UserOut {
        id: row.get("id"),
        name: row.get("name"),
        email: row.get("email"),
    };

    match create_session(db, user.id).await {
        Ok(token) => json_res(StatusCode::OK, Some(session_cookie_header(Some(&token), SESSION_TTL_SECS)), json!({"user": user})),
        Err(err) => {
            tracing::error!("Login session error: {err}");
            json_res(StatusCode::INTERNAL_SERVER_ERROR, None, json!({"error": "Could not log you in — please try again."}))
        }
    }
}

pub async fn handle_logout(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> (StatusCode, HeaderMap, Json<Value>) {
    let Some(db) = &state.db else {
        return json_res(StatusCode::OK, Some(session_cookie_header(None, 0)), json!({"ok": true}));
    };
    let cookies = parse_cookies(&headers);
    if let Some(token) = cookies.get(SESSION_COOKIE) {
        if let Err(err) = sqlx::query("DELETE FROM sessions WHERE token = $1").bind(token).execute(db).await {
            tracing::error!("Logout error: {err}");
        }
    }
    json_res(StatusCode::OK, Some(session_cookie_header(None, 0)), json!({"ok": true}))
}

#[derive(sqlx::FromRow, Serialize)]
struct OrderRow {
    reference: String,
    plan: String,
    amount: String,
    #[serde(rename = "type")]
    order_type: Option<String>,
    pkg: Option<String>,
    domain: Option<String>,
    status: String,
    created_at: DateTime<Utc>,
    paid_at: Option<DateTime<Utc>>,
}

pub async fn handle_me(State(state): State<Arc<AppState>>, headers: HeaderMap) -> (StatusCode, HeaderMap, Json<Value>) {
    let Some(db) = &state.db else {
        return json_res(StatusCode::OK, None, json!({"user": null, "orders": []}));
    };
    let Some(user) = get_session_user(db, &headers).await else {
        return json_res(StatusCode::OK, None, json!({"user": null, "orders": []}));
    };

    let orders = sqlx::query_as::<_, OrderRow>(
        "SELECT reference, plan, amount::text as amount, type as \"type\", pkg, domain, status, created_at, paid_at
         FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    )
    .bind(user.id)
    .fetch_all(db)
    .await;

    match orders {
        Ok(rows) => json_res(StatusCode::OK, None, json!({"user": user, "orders": rows})),
        Err(err) => {
            tracing::error!("Me lookup error: {err}");
            json_res(StatusCode::INTERNAL_SERVER_ERROR, None, json!({"error": "Could not load your account."}))
        }
    }
}

fn json_res(status: StatusCode, cookie: Option<HeaderValue>, body: Value) -> (StatusCode, HeaderMap, Json<Value>) {
    let mut headers = HeaderMap::new();
    if let Some(c) = cookie {
        headers.insert(header::SET_COOKIE, c);
    }
    (status, headers, Json(body))
}
