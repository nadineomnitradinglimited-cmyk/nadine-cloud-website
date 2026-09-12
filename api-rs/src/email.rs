use serde_json::json;

// Mirrors email.js exactly — same FROM/NOTIFY_TO, same Resend payload shape.
const NOTIFY_TO: &str = "info@nadinecloud.com";
const FROM: &str = "Nadine Cloud <info@nadinecloud.com>";

pub struct EmailResult {
    pub ok: bool,
    #[allow(dead_code)]
    pub reason: Option<String>,
}

pub async fn send_email(
    client: &reqwest::Client,
    subject: &str,
    text: &str,
    to: Option<&str>,
    reply_to: Option<&str>,
) -> EmailResult {
    let api_key = match std::env::var("RESEND_API_KEY") {
        Ok(k) => k,
        Err(_) => {
            tracing::error!("RESEND_API_KEY not configured — email not sent: {subject}");
            return EmailResult {
                ok: false,
                reason: Some("not_configured".into()),
            };
        }
    };

    let mut payload = json!({
        "from": FROM,
        "to": [to.unwrap_or(NOTIFY_TO)],
        "subject": subject,
        "text": text,
    });
    if let Some(rt) = reply_to {
        payload["reply_to"] = json!([rt]);
    }

    match client
        .post("https://api.resend.com/emails")
        .bearer_auth(api_key)
        .json(&payload)
        .send()
        .await
    {
        Ok(res) if res.status().is_success() => EmailResult {
            ok: true,
            reason: None,
        },
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            tracing::error!("Resend send failed: {status} {body}");
            EmailResult {
                ok: false,
                reason: Some("api_error".into()),
            }
        }
        Err(err) => {
            tracing::error!("Resend send error: {err}");
            EmailResult {
                ok: false,
                reason: Some("network_error".into()),
            }
        }
    }
}
