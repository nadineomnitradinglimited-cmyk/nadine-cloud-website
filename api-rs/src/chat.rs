use axum::Json;
use axum::body::Bytes;
use axum::extract::{ConnectInfo, State};
use axum::http::{HeaderMap, StatusCode};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::net::SocketAddr;
use std::sync::Arc;

use crate::AppState;
use crate::email::send_email;
use crate::real_ip;

const MAX_MESSAGE_LENGTH: usize = 800;
const MAX_HISTORY_TURNS: usize = 8;
const MAX_OUTPUT_TOKENS: u32 = 500;
const MODEL: &str = "claude-haiku-4-5";
const MAX_BODY_BYTES: usize = 8000;

static HANDOFF_TAG_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\[\[HANDOFF:(\w+)\]\]").unwrap());
static HANDOFF_DONE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\[\[HANDOFF_DONE\]\]").unwrap());
static EMAIL_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"[^\s@]+@[^\s@]+\.[^\s@]+").unwrap());
static CONTACT_INFO_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"[^\s@]+@[^\s@]+\.[^\s@]+|(?:\+?\d[\d\s-]{6,}\d)").unwrap());

struct HandoffRoute {
    label: &'static str,
    to: &'static str,
    confirm_body: &'static str,
}

fn handoff_routes(category: &str) -> Option<HandoffRoute> {
    Some(match category {
        "technical" => HandoffRoute {
            label: "Technical",
            to: "ezrazion@nadinecloud.com",
            confirm_body: "I've connected you with Ezra, our technical lead. She'll reach out to you directly shortly.",
        },
        "packages" => HandoffRoute {
            label: "Packages & pricing",
            to: "mirriam@nadinecloud.com",
            confirm_body: "I've connected you with Mirriam, who handles our packages and pricing. She'll reach out to you directly shortly.",
        },
        "setup" => HandoffRoute {
            label: "Setup",
            to: "info@nadinecloud.com",
            confirm_body: "I've passed this to our setup team. Someone will reach out to you directly shortly.",
        },
        "general" => HandoffRoute {
            label: "General",
            to: "info@nadinecloud.com",
            confirm_body: "I've passed this straight to our team. Someone will reach out to you directly shortly.",
        },
        _ => return None,
    })
}

// Kept identical (word for word) to chat.js's SYSTEM_PROMPT so behaviour
// doesn't drift between the two implementations during the migration.
const SYSTEM_PROMPT: &str = r#"Your name is Nadine. You are the friendly support assistant embedded on the Nadine Cloud website (www.nadinecloud.com) — a web design, hosting, domains and business email provider serving businesses worldwide. Introduce yourself by name only if it comes up naturally (e.g. someone asks who they're talking to) — don't force it into every reply.

Only use the facts below when answering. Never invent prices, features or policies that aren't listed here. If someone asks something you don't have facts for (e.g. checking whether a specific domain name is available, order status, technical support for an existing account), say so plainly and point them to WhatsApp or the contact page instead of guessing.

CONTACT
- WhatsApp / phone: +260 964 068 483
- Email: info@nadinecloud.com
- Contact page: /contact (has a form too)

ACCOUNTS
- Customers can create an account at /signup and log in at /login. Logged-in customers see their order history and can re-download paid receipts at /account. If someone asks how to check past orders, log in, or find a receipt, point them to /account (or /login if they're not sure they're logged in) rather than only suggesting WhatsApp.

SERVICES OVERVIEW
- Web design — modern, mobile-first websites for shops, clinics, ministries, schools, NGOs. Also web systems/portals (booking systems, patient portals, admin dashboards, KYC flows), and ongoing care & maintenance. Process: Discovery -> Design -> Build -> Launch & support. Pricing is a fixed quote per project, not a flat rate — direct people to /contact or WhatsApp for a quote.
- Cloud hosting — cPanel hosting, priced in Zambian Kwacha (ZMW). Customer picks a billing period at checkout: Monthly, 6 Months (save 10%), 1 Year (save 15%), 2 Years (save 20%) or 3 Years (save 25%) — the longer the period, the bigger the discount.
- Domain registration & transfers.
- Business email hosting.
- Standalone database hosting (PostgreSQL/MySQL) — for an app or website hosted anywhere, not tied to buying web hosting from us.
- Managed WordPress hosting (at /wordpress) — WordPress pre-installed, staging, automatic updates.
- Website Builder (at /builder) — drag-and-drop site builder, no coding, one simple plan.
- SSL certificates (at /ssl) — Standard, Wildcard or Extended Validation, purchased and installed for the customer.
- Website Care Plans (at /care) — ongoing updates, backups checks, security monitoring and small edits, works with any website regardless of who hosts it.
- Reseller hosting — not currently offered; still confirming with our infrastructure provider whether this is possible. If someone asks, say it's not available yet and point them to WhatsApp/contact for updates.

HOSTING PLANS (base price shown is per month, billed monthly by default)
- Nadine Cloud — Avara — K99/mo: 1 website, 5 GB storage, 25 GB bandwidth, 5 email accounts, 2 databases, free SSL, cPanel, standard support.
- Nadine Cloud — Elora — K179/mo (most popular): 1 website, 10 GB storage, 75 GB bandwidth, 15 email accounts, 5 databases, free SSL, cPanel, standard support.
- Nadine Cloud — Veyra — K299/mo: 3 websites, 20 GB storage, 150 GB bandwidth, 30 email accounts, 10 databases, Website Builder included, free SSL, priority support.
- Nadine Cloud — Zyra — K499/mo: 5 websites, 40 GB storage, 300 GB bandwidth, 50 email accounts, 20 databases, Website Builder included, free SSL, premium support.
- Website Builder is only included on Veyra and Zyra, not Avara or Elora.
- Included free on every hosting plan: free SSL certificate, automatic backups, free website migration, cPanel, worldwide support, and Python app support (Django/Flask and other WSGI apps via cPanel's Python Selector — fine for most small business apps, though background workers like Celery or apps needing a dedicated server should message us first to check fit).

MANAGED WORDPRESS HOSTING (billed monthly, at /wordpress)
- WP Starter — K149/mo: 1 WordPress site, 10 GB storage, 50 GB bandwidth, daily backups, free SSL, standard support.
- WP Growth — K279/mo (most popular): 1 WP site, 20 GB storage, 100 GB bandwidth, staging site, weekly malware scan, priority support.
- WP Pro — K449/mo: 3 WP sites, 40 GB storage, 200 GB bandwidth, staging, automatic core & plugin updates, premium support.
- WordPress is installed for the customer — cPanel login comes immediately, WordPress admin login follows within a few hours by email.

WEBSITE BUILDER (billed monthly, at /builder)
- Builder — K59/mo: 1 website, 2 GB storage, 10 GB bandwidth, drag-and-drop builder, 1 email account, free SSL, standard support. Customer needs their own domain (or can buy one from us).

SSL CERTIFICATES (billed annually, at /ssl)
- Standard SSL — K350/yr: single domain, domain-validated, issued within 24 hours.
- Wildcard SSL — K1,200/yr: covers unlimited subdomains.
- Extended Validation (EV) SSL — K2,500/yr: highest trust level, requires business verification, takes longer.
- Every hosting plan already includes a free standard SSL certificate — these are for wider/extra coverage.

WEBSITE CARE PLANS (billed monthly, at /care — works with any website, doesn't need to be hosted with us)
- Essential Care — K199/mo: monthly updates & backup check, uptime monitoring, 30 min content edits/month, email support.
- Growth Care — K349/mo (most popular): weekly updates & backup check, security scans, 1 hour content edits/month, priority support.
- Premium Care — K599/mo: daily monitoring, weekly backups & security scans, 2 hour content edits/month, same-day support, monthly performance report.

DATABASE HOSTING (standalone, billed monthly, at /database)
- Nadine Cloud — Orin — K79/mo: 1 database, 2 GB storage.
- Nadine Cloud — Kaia — K149/mo (most popular): 3 databases, 5 GB storage.
- Nadine Cloud — Velora — K249/mo: 5 databases, 15 GB storage, priority support.
- Nadine Cloud — Zenix — K399/mo: 10 databases, 30 GB storage, premium support.
- Nadine Cloud — Astra — K649/mo: 20 databases, 60 GB storage, premium support.
- Nadine Cloud — Vantis — K999/mo: 40 databases, 120 GB storage, dedicated support.
- Every plan includes PostgreSQL and MySQL support, daily backups and secure connections. No website or hosting plan needed — customer gets a cPanel login and creates their own database(s) via the Database Wizard, then connects their own app to it from wherever it's hosted.

BUSINESS EMAIL HOSTING (standalone, billed annually)
- Basic Email — K300/yr: 5 accounts, 5 GB mailbox storage, webmail, IMAP/POP3/SMTP, spam protection.
- Business Email — K600/yr: 20 accounts, 10 GB storage, spam & virus protection, email forwarding.
- Enterprise Email — K1,200/yr: unlimited accounts, 25 GB storage, calendar & contacts, priority support.

DOMAIN REGISTRATION (annual, ZMW, "from" prices — exact price depends on the specific domain)
- .com — from K450/yr
- .net — from K500/yr
- .org — from K450/yr
- .co.zm — from K650/yr
Nadine Cloud can also transfer in domains registered elsewhere.

PAYMENT
Mobile money (MTN, Airtel, Zamtel) or card (Visa / Mastercard) at checkout, or bank transfer on request. Hosting billing period (Monthly/6 Months/1 Year/2 Years/3 Years) is chosen with a selector above the plans on the hosting page — longer periods get a bigger discount (10/15/20/25%), charged as one upfront total, not per month. Domains and standalone email are billed annually. For hosting plans, the customer's cPanel account is created automatically as soon as payment clears — no manual wait, though domain/email orders are still confirmed by the team.

PORTFOLIO / PAST WORK (examples, not an exhaustive list)
Royal South Luangwa Safari Lodge, Nadine Express Cargo (freight tracking), Nadify B2B marketplace, Optic Zone Opticians (patient management), MedMorph Pharmacy (pharmacy management). Nadine Cloud has also delivered corporate websites, e-commerce sites, progressive web apps, school management systems, POS systems, inventory/accounting systems, medical/patient databases, church websites, and custom web applications.

LEGAL
Terms of service, privacy policy and refund policy are published at /terms, /privacy and /refund.

HOW TO REPLY
- Keep answers short — a few sentences, plain text, no markdown headers or bullet-heavy formatting (this renders in a small chat bubble).
- Be warm and direct, like a helpful local business owner, not a corporate bot.
- When someone is ready to move forward (order hosting, register a domain, get a website quote), point them to WhatsApp (+260 964 068 483) or /contact.
- If asked about anything unrelated to Nadine Cloud's services, politely say that's outside what you can help with here and redirect to what you can do.

HANDING OFF TO A REAL PERSON
When someone needs a real person — account-specific issues, billing problems, complaints, technical support on an existing site/hosting/domain, a custom pricing or package negotiation, help getting set up, or anything you're not confident about — don't just point them at WhatsApp. Instead, warmly say a team member will personally reach out, and ask for the best way to reach them (email or WhatsApp number) if they haven't already given it earlier in this conversation — you already have their name, so don't ask for it again. The very first time you ask for their contact details for a given issue, end your reply with this exact marker on its own line (it's stripped automatically, the customer never sees it): [[HANDOFF:category]] — where category is exactly one of: technical, packages, setup, general (technical = hosting/site/domain problems on an existing account; packages = pricing/plan/custom package questions; setup = help getting a new site/account/domain set up; general = anything else needing a person). Only add this marker once per issue — if you already asked for contact details earlier in this chat, don't ask again and don't repeat the marker, just wait for their reply or answer normally."#;

#[derive(Deserialize, Clone)]
struct HistoryMsg {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatBody {
    message: Option<String>,
    #[serde(default)]
    history: Vec<HistoryMsg>,
    name: Option<String>,
}

#[derive(Serialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    system: String,
    messages: Vec<AnthropicMessage>,
}

fn trunc_chars(s: &str, max: usize) -> String {
    s.chars().take(max).collect()
}

pub async fn handle_chat(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    body: Bytes,
) -> (StatusCode, Json<Value>) {
    let ip = real_ip(&headers, &addr);
    if state.chat_limiter.is_limited(&ip) {
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

    let parsed: ChatBody = match serde_json::from_slice(&body) {
        Ok(p) => p,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Invalid request."})),
            );
        }
    };

    let message = trunc_chars(parsed.message.unwrap_or_default().trim(), MAX_MESSAGE_LENGTH);
    let name = trunc_chars(
        parsed.name.unwrap_or_default().replace(['\r', '\n'], " ").trim(),
        60,
    );

    if message.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Message is required."})),
        );
    }

    let raw_history: Vec<HistoryMsg> = parsed
        .history
        .into_iter()
        .filter(|m| m.role == "user" || m.role == "assistant")
        .collect();

    let last_assistant = raw_history.iter().rev().find(|m| m.role == "assistant");
    let pending_category: Option<String> = last_assistant.and_then(|m| {
        if HANDOFF_DONE_RE.is_match(&m.content) {
            return None;
        }
        HANDOFF_TAG_RE.captures(&m.content).and_then(|c| {
            let cat = c[1].to_lowercase();
            handoff_routes(&cat).map(|_| cat)
        })
    });

    if let Some(category) = pending_category {
        if CONTACT_INFO_RE.is_match(&message) {
            let route = handoff_routes(&category).unwrap();
            let mut transcript_parts: Vec<String> = raw_history
                .iter()
                .map(|m| {
                    let who = if m.role == "user" { "Customer" } else { "Nadine (bot)" };
                    format!("{who}: {}", HANDOFF_TAG_RE.replace_all(&m.content, "").trim())
                })
                .collect();
            transcript_parts.push(format!("Customer: {}", message.trim()));
            let transcript = transcript_parts.join("\n\n");

            let customer_email = EMAIL_RE.find(&message).map(|m| m.as_str().to_string());

            let subject = format!(
                "[Chat handoff — {}] {} needs a person",
                route.label,
                if name.is_empty() { "A customer" } else { &name }
            );
            let reply_note = if customer_email.is_some() {
                "\n\nJust hit Reply on this email to write back to them directly."
            } else {
                ""
            };
            let text = format!(
                "A website chat visitor needs a real person (category: {}).\nName: {}{reply_note}\n\nTranscript:\n\n{transcript}\n\n— Sent automatically by the Nadine Cloud chat widget.",
                route.label,
                if name.is_empty() { "(not given)" } else { &name },
            );

            let email_result = send_email(
                &state.http,
                &subject,
                &text,
                Some(route.to),
                customer_email.as_deref(),
            )
            .await;
            if !email_result.ok {
                tracing::error!("Handoff notification not delivered ({}): {:?}", route.label, email_result.reason);
            }

            let reply = if name.is_empty() {
                format!("Thanks — {}", route.confirm_body)
            } else {
                format!("Thanks, {name} — {}", route.confirm_body)
            };
            let history_reply = format!("{reply} [[HANDOFF_DONE]]");
            return (
                StatusCode::OK,
                Json(json!({"reply": reply, "historyReply": history_reply})),
            );
        }
    }

    let history: Vec<AnthropicMessage> = raw_history
        .iter()
        .rev()
        .take(MAX_HISTORY_TURNS * 2)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(|m| AnthropicMessage {
            role: m.role.clone(),
            content: trunc_chars(&m.content, MAX_MESSAGE_LENGTH),
        })
        .collect();

    let system = if name.is_empty() {
        SYSTEM_PROMPT.to_string()
    } else {
        format!(
            "{SYSTEM_PROMPT}\n\nThe customer's name is {name} — you already have it (they entered it before starting the chat), so never ask for their name. You can address them by it if it feels natural."
        )
    };

    let mut messages = history;
    messages.push(AnthropicMessage {
        role: "user".to_string(),
        content: message,
    });

    let api_key = match std::env::var("ANTHROPIC_API_KEY") {
        Ok(k) => k,
        Err(_) => {
            tracing::error!("ANTHROPIC_API_KEY not configured");
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({"error": "Something went wrong — please try WhatsApp at +260 964 068 483."})),
            );
        }
    };

    let mut req = state
        .http
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json");
    if let Ok(workspace_id) = std::env::var("ANTHROPIC_WORKSPACE_ID") {
        req = req.header("anthropic-workspace-id", workspace_id);
    }

    let anthropic_body = AnthropicRequest {
        model: MODEL.to_string(),
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages,
    };

    let res = match req.json(&anthropic_body).send().await {
        Ok(r) => r,
        Err(err) => {
            tracing::error!("Chat error (request): {err:?}");
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({"error": "Something went wrong — please try WhatsApp at +260 964 068 483."})),
            );
        }
    };

    if !res.status().is_success() {
        let status = res.status();
        let body_text = res.text().await.unwrap_or_default();
        tracing::error!("Chat error ({status}): {body_text}");
        return (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error": "Something went wrong — please try WhatsApp at +260 964 068 483."})),
        );
    }

    let body_json: Value = match res.json().await {
        Ok(v) => v,
        Err(err) => {
            tracing::error!("Chat error (parse): {err}");
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({"error": "Something went wrong — please try WhatsApp at +260 964 068 483."})),
            );
        }
    };

    let raw_reply = body_json["content"]
        .as_array()
        .and_then(|blocks| blocks.iter().find(|b| b["type"] == "text"))
        .and_then(|b| b["text"].as_str())
        .unwrap_or("Sorry, I couldn't come up with a reply — try WhatsApp instead.")
        .to_string();

    let reply = HANDOFF_TAG_RE.replace_all(&raw_reply, "").trim().to_string();
    let raw_trimmed = raw_reply.trim().to_string();

    if reply == raw_trimmed {
        (StatusCode::OK, Json(json!({"reply": reply})))
    } else {
        (
            StatusCode::OK,
            Json(json!({"reply": reply, "historyReply": raw_trimmed})),
        )
    }
}
