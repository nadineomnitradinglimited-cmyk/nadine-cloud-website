mod auth;
mod chat;
mod contact;
mod domain_check;
mod email;
mod rate_limit;

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use axum::http::HeaderMap;
use axum::{Json, Router, extract::State, routing::{get, post}};
use serde_json::{Value, json};
use sqlx::postgres::{PgPool, PgPoolOptions};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use rate_limit::RateLimiter;

// Phase 1 of the Node -> Rust migration: this service now also serves the
// three lowest-risk endpoints (domain-check, contact, chat) identified in
// the migration plan as safe first candidates — no money movement, no
// provisioning side effects. server.js proxies these three paths here;
// everything else (checkout, auth, WHM/Namecheap provisioning) still runs
// entirely in Node.
pub struct AppState {
    // None of the three routes migrated so far (domain-check, contact,
    // chat) touch the database — a Postgres outage shouldn't crash-loop
    // this whole service, so the connection is optional at startup.
    // /health/db reports the real state instead of panicking.
    db: Option<PgPool>,
    http: reqwest::Client,
    domain_check_limiter: RateLimiter,
    contact_limiter: RateLimiter,
    chat_limiter: RateLimiter,
    auth_limiter: RateLimiter,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let db = match std::env::var("DATABASE_URL") {
        Ok(database_url) => {
            match PgPoolOptions::new()
                .max_connections(5)
                .acquire_timeout(Duration::from_secs(5))
                .connect(&database_url)
                .await
            {
                Ok(pool) => Some(pool),
                Err(err) => {
                    tracing::error!("Postgres connection failed at startup (continuing without it): {err}");
                    None
                }
            }
        }
        Err(_) => {
            tracing::warn!("DATABASE_URL not set — starting without a database connection");
            None
        }
    };

    let state = Arc::new(AppState {
        db,
        http: reqwest::Client::new(),
        // Same window/max as namecheap.js, contact.js, chat.js respectively.
        domain_check_limiter: RateLimiter::new(Duration::from_secs(60), 10),
        contact_limiter: RateLimiter::new(Duration::from_secs(60), 5),
        chat_limiter: RateLimiter::new(Duration::from_secs(60), 8),
        auth_limiter: RateLimiter::new(Duration::from_secs(60), 8),
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health))
        .route("/health/db", get(health_db))
        .route("/api/domain-check", get(domain_check::handle_domain_check))
        .route("/api/contact", post(contact::handle_contact))
        .route("/api/chat", post(chat::handle_chat))
        .route("/api/auth/signup", post(auth::handle_signup))
        .route("/api/auth/login", post(auth::handle_login))
        .route("/api/auth/logout", post(auth::handle_logout))
        .route("/api/auth/me", get(auth::handle_me))
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8787);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    tracing::info!("nadine-api (Rust) listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}

async fn health() -> Json<Value> {
    Json(json!({ "ok": true, "service": "nadine-api-rs" }))
}

// Read-only proof that this service can reach the same database the Node
// app writes to. Counts existing orders — never writes anything.
async fn health_db(State(state): State<Arc<AppState>>) -> Json<Value> {
    let Some(db) = &state.db else {
        return Json(json!({ "ok": false, "error": "not connected" }));
    };
    match sqlx::query_scalar::<_, i64>("SELECT count(*) FROM orders")
        .fetch_one(db)
        .await
    {
        Ok(count) => Json(json!({ "ok": true, "orders_count": count })),
        Err(err) => Json(json!({ "ok": false, "error": err.to_string() })),
    }
}

// Mirrors the (req.headers['x-forwarded-for'] || req.socket.remoteAddress ||
// 'unknown').split(',')[0].trim() pattern used throughout the Node app.
pub fn real_ip(headers: &HeaderMap, addr: &SocketAddr) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .map(|v| v.split(',').next().unwrap_or("").trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| addr.ip().to_string())
}
