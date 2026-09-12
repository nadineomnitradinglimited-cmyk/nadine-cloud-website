use std::net::SocketAddr;
use std::time::Duration;

use axum::{Json, Router, extract::State, routing::get};
use serde_json::{Value, json};
use sqlx::postgres::{PgPool, PgPoolOptions};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

// Phase 0 of the Node -> Rust migration: this service does nothing
// user-facing yet. It only proves the deploy pipeline works and that it
// can read (never write, at this phase) the same Postgres database the
// existing Node app already uses. See the migration plan for the phased
// cutover — no production traffic is routed here yet.
#[derive(Clone)]
struct AppState {
    db: PgPool,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&database_url)
        .await
        .expect("failed to connect to Postgres");

    let state = AppState { db };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health))
        .route("/health/db", get(health_db))
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
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> Json<Value> {
    Json(json!({ "ok": true, "service": "nadine-api-rs" }))
}

// Read-only proof that this service can reach the same database the Node
// app writes to. Counts existing orders — never writes anything.
async fn health_db(State(state): State<AppState>) -> Json<Value> {
    match sqlx::query_scalar::<_, i64>("SELECT count(*) FROM orders")
        .fetch_one(&state.db)
        .await
    {
        Ok(count) => Json(json!({ "ok": true, "orders_count": count })),
        Err(err) => Json(json!({ "ok": false, "error": err.to_string() })),
    }
}
