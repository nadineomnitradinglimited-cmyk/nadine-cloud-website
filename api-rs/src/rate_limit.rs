use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

// Mirrors the sliding-window-per-IP limiter used throughout the Node app
// (chat.js, contact.js, namecheap.js, payments.js) — same window/max
// semantics, same crude "clear everything past 5000 keys" cap.
pub struct RateLimiter {
    window: Duration,
    max: usize,
    hits: Mutex<HashMap<String, Vec<Instant>>>,
}

impl RateLimiter {
    pub fn new(window: Duration, max: usize) -> Self {
        Self {
            window,
            max,
            hits: Mutex::new(HashMap::new()),
        }
    }

    pub fn is_limited(&self, ip: &str) -> bool {
        let now = Instant::now();
        let mut hits = self.hits.lock().unwrap();
        let mut recent: Vec<Instant> = hits
            .get(ip)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter(|t| now.duration_since(*t) < self.window)
            .collect();
        recent.push(now);
        let count = recent.len();
        hits.insert(ip.to_string(), recent);
        if hits.len() > 5000 {
            hits.clear();
        }
        count > self.max
    }
}
