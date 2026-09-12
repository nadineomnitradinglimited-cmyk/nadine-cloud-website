use axum::Json;
use axum::body::Bytes;
use serde::Deserialize;
use serde_json::{Value, json};
use std::collections::HashSet;
use std::sync::LazyLock;

// SHADOW MODE ONLY. This never calls Lenco, WHM, or Namecheap's
// registration API — it only replicates the pure validation/decision
// logic from payments.js's handleCheckoutInitiate, so real (mirrored)
// checkout traffic can be compared against what Node actually decided,
// without any risk of a duplicate charge or duplicate infrastructure
// side effect. Node stays fully authoritative; nothing here is trusted.

static HOSTING_PACKAGES: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| ["avara", "elora", "veyra", "zyra"].into_iter().collect());
static DATABASE_PACKAGES: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    ["orin", "kaia", "velora", "zenix", "astra", "vantis"]
        .into_iter()
        .collect()
});
static WORDPRESS_PACKAGES: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| ["wpstarter", "wpgrowth", "wppro"].into_iter().collect());
static BUILDER_PACKAGES: LazyLock<HashSet<&'static str>> = LazyLock::new(|| ["builder"].into_iter().collect());
static SSL_PRODUCTS: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| ["ssl-standard", "ssl-wildcard", "ssl-ev"].into_iter().collect());
static CARE_PRODUCTS: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| ["care-essential", "care-growth", "care-premium"].into_iter().collect());
static OPERATORS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| ["mtn", "airtel", "zamtel"].into_iter().collect());

#[derive(Deserialize, Default)]
struct CheckoutBody {
    plan: Option<String>,
    amount: Option<f64>,
    name: Option<String>,
    email: Option<String>,
    phone: Option<String>,
    operator: Option<String>,
    domain: Option<String>,
    #[serde(rename = "type")]
    order_type: Option<String>,
    pkg: Option<String>,
    #[serde(rename = "domainOption")]
    domain_option: Option<String>,
    address1: Option<String>,
    city: Option<String>,
    #[serde(rename = "postalCode")]
    postal_code: Option<String>,
    country: Option<String>,
}

fn is_valid_email(s: &str) -> bool {
    match s.split_once('@') {
        Some((local, domain)) => !local.is_empty() && domain.contains('.') && !domain.starts_with('.'),
        None => false,
    }
}

fn is_valid_domain(s: &str) -> bool {
    // mirrors /^[a-z0-9.-]+\.[a-z]{2,}$/ from payments.js
    if let Some((_, tld)) = s.rsplit_once('.') {
        !s.is_empty()
            && s.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '.' || c == '-')
            && tld.len() >= 2
            && tld.chars().all(|c| c.is_ascii_lowercase())
    } else {
        false
    }
}

// Returns (would_accept, reason_if_rejected, needs_registrant)
fn evaluate(body: &CheckoutBody) -> (bool, Option<String>, bool) {
    let plan = body.plan.as_deref().unwrap_or("").trim();
    let amount = body.amount.unwrap_or(f64::NAN);
    let name = body.name.as_deref().unwrap_or("").trim();
    let email = body.email.as_deref().unwrap_or("").trim();
    let phone_digits: String = body.phone.as_deref().unwrap_or("").chars().filter(|c| c.is_ascii_digit()).collect();
    let operator = body.operator.as_deref().unwrap_or("").to_lowercase();
    let domain = body.domain.as_deref().unwrap_or("").trim().to_lowercase();
    let order_type = body.order_type.as_deref().unwrap_or("").trim();
    let pkg = body.pkg.as_deref().unwrap_or("").trim().to_lowercase();
    let domain_option = if body.domain_option.as_deref() == Some("new") { "new" } else { "existing" };
    let address1 = body.address1.as_deref().unwrap_or("").trim();
    let city = body.city.as_deref().unwrap_or("").trim();
    let postal_code = body.postal_code.as_deref().unwrap_or("").trim();
    let country = body.country.as_deref().unwrap_or("").trim().to_uppercase();

    if plan.is_empty() {
        return (false, Some("Missing plan.".into()), false);
    }
    if !amount.is_finite() || amount <= 0.0 || amount > 20000.0 {
        return (false, Some("Invalid amount.".into()), false);
    }
    if name.is_empty() {
        return (false, Some("Name is required.".into()), false);
    }
    if !is_valid_email(email) {
        return (false, Some("A valid email is required.".into()), false);
    }
    if phone_digits.len() < 9 {
        return (false, Some("A valid mobile money phone number is required.".into()), false);
    }
    if !OPERATORS.contains(operator.as_str()) {
        return (false, Some("Select MTN, Airtel or Zamtel.".into()), false);
    }

    if order_type == "hosting" {
        if pkg.is_empty() || !HOSTING_PACKAGES.contains(pkg.as_str()) {
            return (false, Some("Missing or invalid hosting package.".into()), false);
        }
        if domain.is_empty() || !is_valid_domain(&domain) {
            return (false, Some("A valid domain is required to set up hosting.".into()), false);
        }
    }
    if order_type == "database" && (pkg.is_empty() || !DATABASE_PACKAGES.contains(pkg.as_str())) {
        return (false, Some("Missing or invalid database package.".into()), false);
    }
    if order_type == "wordpress" {
        if pkg.is_empty() || !WORDPRESS_PACKAGES.contains(pkg.as_str()) {
            return (false, Some("Missing or invalid WordPress hosting package.".into()), false);
        }
        if domain.is_empty() || !is_valid_domain(&domain) {
            return (false, Some("A valid domain is required to set up WordPress hosting.".into()), false);
        }
    }
    if order_type == "builder" {
        if pkg.is_empty() || !BUILDER_PACKAGES.contains(pkg.as_str()) {
            return (false, Some("Missing or invalid Website Builder package.".into()), false);
        }
        if domain.is_empty() || !is_valid_domain(&domain) {
            return (false, Some("A valid domain is required to set up Website Builder.".into()), false);
        }
    }
    if order_type == "ssl" {
        if pkg.is_empty() || !SSL_PRODUCTS.contains(pkg.as_str()) {
            return (false, Some("Missing or invalid SSL certificate type.".into()), false);
        }
        if domain.is_empty() || !is_valid_domain(&domain) {
            return (false, Some("A valid domain is required for an SSL certificate.".into()), false);
        }
    }
    if order_type == "care" && (pkg.is_empty() || !CARE_PRODUCTS.contains(pkg.as_str())) {
        return (false, Some("Missing or invalid care plan.".into()), false);
    }

    let needs_registrant = order_type == "domain" || (order_type == "hosting" && domain_option == "new");
    if needs_registrant {
        if domain.is_empty() {
            return (false, Some("A domain name is required.".into()), true);
        }
        if address1.is_empty() || city.is_empty() || postal_code.is_empty() || country.is_empty() || country == "OTHER" {
            return (
                false,
                Some("A full contact address is required to register a domain — please fill in every field, or message us on WhatsApp if your country isn't listed.".into()),
                true,
            );
        }
    }

    (true, None, needs_registrant)
}

pub async fn handle_checkout_shadow(body: Bytes) -> Json<Value> {
    let parsed: CheckoutBody = match serde_json::from_slice(&body) {
        Ok(p) => p,
        Err(_) => return Json(json!({"wouldAccept": false, "reason": "Invalid request (unparseable JSON)."})),
    };
    let (would_accept, reason, needs_registrant) = evaluate(&parsed);
    tracing::info!(
        "Shadow checkout verdict: accept={would_accept} reason={:?} type={:?} pkg={:?}",
        reason,
        parsed.order_type,
        parsed.pkg
    );
    Json(json!({
        "wouldAccept": would_accept,
        "reason": reason,
        "needsRegistrant": needs_registrant,
    }))
}
