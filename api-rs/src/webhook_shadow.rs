use axum::Json;
use axum::body::Bytes;
use axum::extract::State;
use axum::http::HeaderMap;
use hmac::{Hmac, KeyInit, Mac};
use serde_json::{Value, json};
use sha2::{Digest, Sha256, Sha512};
use std::sync::Arc;
use subtle::ConstantTimeEq;

use crate::AppState;

// SHADOW MODE ONLY — mirrors payments.js's Lenco webhook signature check
// (crypto.createHash('sha256').update(apiKey).digest() as the HMAC key,
// then HMAC-SHA512 over the raw body, hex-compared against the
// x-lenco-signature header). This never acts on the webhook payload in
// any way — it only logs whether Rust's verdict on the signature matches
// what Node already decided, so the two implementations can be compared
// before Rust is ever trusted to actually process a real payment webhook.

pub async fn handle_webhook_shadow(
    State(_state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> Json<Value> {
    let Ok(api_key) = std::env::var("LENCO_API_KEY") else {
        return Json(json!({"wouldAccept": false, "reason": "LENCO_API_KEY not configured"}));
    };
    let Some(signature) = headers.get("x-lenco-signature").and_then(|v| v.to_str().ok()) else {
        return Json(json!({"wouldAccept": false, "reason": "missing x-lenco-signature header"}));
    };

    let hash_key = Sha256::digest(api_key.as_bytes());

    let mut mac = match Hmac::<Sha512>::new_from_slice(&hash_key) {
        Ok(m) => m,
        Err(_) => return Json(json!({"wouldAccept": false, "reason": "HMAC key init failed"})),
    };
    mac.update(&body);
    let expected = mac.finalize().into_bytes();
    let expected_hex = hex::encode(expected);

    let sig_bytes = match hex::decode(signature.trim()) {
        Ok(b) => b,
        Err(_) => return Json(json!({"wouldAccept": false, "reason": "signature not valid hex"})),
    };
    let expected_bytes = match hex::decode(&expected_hex) {
        Ok(b) => b,
        Err(_) => return Json(json!({"wouldAccept": false, "reason": "internal hex encode error"})),
    };

    let matches = sig_bytes.len() == expected_bytes.len()
        && bool::from(sig_bytes.ct_eq(&expected_bytes));

    tracing::info!("Shadow webhook signature verdict: matches={matches}");
    Json(json!({ "wouldAccept": matches }))
}
