import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "SSL Certificates — Nadine Cloud";
const DESCRIPTION =
  "Standard, Wildcard and Extended Validation SSL certificates, installed for you. Priced in your local currency.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/ssl" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/ssl",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

const SSL_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x={4} y={11} width={16} height={9} rx={2} />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export default function Ssl() {
  return (
    <>
      <Header getStartedHref="/ssl#plans" />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">One Cloud. Endless Possibilities.</span>
          <h1>SSL certificates, purchased and installed for you.</h1>
          <p>Secure your domain with the padlock your customers expect — we handle issuance and installation.</p>
        </div>
      </section>

      <section className="section pricing" id="plans">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Nadine Cloud SSL</span>
            <h2>Certificate types</h2>
            <p>Every hosting plan already includes a free standard SSL certificate — these are for extra validation or wildcard coverage across subdomains.</p>
          </div>
          <div className="plans">
            <div className="plan">
              <div className="plan-icon">{SSL_ICON}</div>
              <h3>Standard SSL</h3>
              <div className="for">Single domain, domain-validated</div>
              <div className="price"><span className="amt amt-live" data-zmw="350">ZMW 350</span> <span className="per">/year</span><small className="price-note" hidden></small></div>
              <ul>
                <li>1 Domain Covered</li>
                <li>Issued Within 24 Hours</li>
                <li>Installed For You</li>
                <li>Standard Support</li>
              </ul>
              <a className="cta" href="/checkout?type=ssl&pkg=ssl-standard&plan=Standard+SSL&amount=350&period=yr">Get Standard SSL</a>
            </div>
            <div className="plan featured">
              <div className="plan-icon">{SSL_ICON}</div>
              <h3>Wildcard SSL</h3>
              <div className="for">Covers unlimited subdomains</div>
              <div className="price"><span className="amt amt-live" data-zmw="1200">ZMW 1,200</span> <span className="per">/year</span><small className="price-note" hidden></small></div>
              <ul>
                <li>Domain + All Subdomains</li>
                <li>Issued Within 24 Hours</li>
                <li>Installed For You</li>
                <li>Priority Support</li>
              </ul>
              <a className="cta" href="/checkout?type=ssl&pkg=ssl-wildcard&plan=Wildcard+SSL&amount=1200&period=yr">Get Wildcard SSL</a>
            </div>
            <div className="plan">
              <div className="plan-icon">{SSL_ICON}</div>
              <h3>Extended Validation (EV)</h3>
              <div className="for">Highest trust level, verified business identity</div>
              <div className="price"><span className="amt amt-live" data-zmw="2500">ZMW 2,500</span> <span className="per">/year</span><small className="price-note" hidden></small></div>
              <ul>
                <li>1 Domain Covered</li>
                <li>Business Verification Required</li>
                <li>Installed For You</li>
                <li>Premium Support</li>
              </ul>
              <a className="cta" href="/checkout?type=ssl&pkg=ssl-ev&plan=Extended+Validation+SSL&amount=2500&period=yr">Get EV SSL</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="faq" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>SSL Certificate FAQ</h2>
            <p>Anything else, just ask us on WhatsApp.</p>
          </div>
          <div className="faq">
            <details className="faq-item" open>
              <summary>How long does it take to go live?</summary>
              <p>Standard and Wildcard certificates are usually issued and installed within 24 hours. Extended Validation takes a bit longer since it requires verifying your registered business details — we&apos;ll be in touch to collect what&apos;s needed.</p>
            </details>
            <details className="faq-item">
              <summary>Do I need this if I already have free SSL from my hosting plan?</summary>
              <p>Not necessarily — the free certificate included with hosting covers most sites. These are for extra cases: covering many subdomains at once (Wildcard) or showing your verified business name in the browser (EV).</p>
            </details>
            <details className="faq-item">
              <summary>What payment methods do you accept?</summary>
              <p>Mobile money (MTN, Airtel, Zamtel) at checkout, or bank transfer on request — card payments are coming soon.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Ready when you are</span>
          <h2>Secure your domain today</h2>
          <p>We&apos;ll confirm by email once your certificate is live.</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Choose a certificate</a>
            <a className="btn-ghost" href="https://wa.me/260770346698?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20ask%20about%20an%20SSL%20certificate." target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <Footer
        productsExtra={[
          { href: "/ssl", label: "SSL certificates" },
          { href: "/database", label: "Database hosting" },
        ]}
        supportLinks={[
          { href: "/hosting#security", label: "Security" },
          { href: "/ssl#faq", label: "Help center" },
          { href: "/contact", label: "Contact us" },
        ]}
      />
    </>
  );
}
