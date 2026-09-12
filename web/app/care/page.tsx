import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Website Care Plans — Nadine Cloud";
const DESCRIPTION =
  "Ongoing website care — updates, backups checks, security monitoring and small edits, handled for you every month.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/care" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/care",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

const CARE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default function Care() {
  return (
    <>
      <Header getStartedHref="/care#plans" />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">One Cloud. Endless Possibilities.</span>
          <h1>We look after your website, so you don&apos;t have to.</h1>
          <p>Ongoing updates, backup checks, security monitoring and small edits — handled every month by our team.</p>
        </div>
      </section>

      <section className="section pricing" id="plans">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Nadine Cloud Care Plans</span>
            <h2>Care plans for any website</h2>
            <p>Works with any site — whether we built it, or you brought it to us. No hosting change required.</p>
          </div>
          <div className="plans">
            <div className="plan">
              <div className="plan-icon">{CARE_ICON}</div>
              <h3>Essential Care</h3>
              <div className="for">Basic peace of mind</div>
              <div className="price"><span className="amt amt-live" data-zmw="199">ZMW 199</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <ul>
                <li>Monthly Updates &amp; Backup Check</li>
                <li>Uptime Monitoring</li>
                <li>30 Min Content Edits / Month</li>
                <li>Email Support</li>
              </ul>
              <a className="cta" href="/checkout?type=care&pkg=care-essential&plan=Essential+Care&amount=199&period=mo">Get Essential Care</a>
            </div>
            <div className="plan featured">
              <div className="plan-icon">{CARE_ICON}</div>
              <h3>Growth Care</h3>
              <div className="for">Our most popular care plan</div>
              <div className="price"><span className="amt amt-live" data-zmw="349">ZMW 349</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <ul>
                <li>Weekly Updates &amp; Backup Check</li>
                <li>Uptime Monitoring &amp; Security Scans</li>
                <li>1 Hour Content Edits / Month</li>
                <li>Priority Support</li>
              </ul>
              <a className="cta" href="/checkout?type=care&pkg=care-growth&plan=Growth+Care&amount=349&period=mo">Get Growth Care</a>
            </div>
            <div className="plan">
              <div className="plan-icon">{CARE_ICON}</div>
              <h3>Premium Care</h3>
              <div className="for">Hands-off, fully managed</div>
              <div className="price"><span className="amt amt-live" data-zmw="599">ZMW 599</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <ul>
                <li>Daily Monitoring</li>
                <li>Weekly Backups &amp; Security Scans</li>
                <li>2 Hour Content Edits / Month</li>
                <li>Same-Day Support</li>
                <li>Monthly Performance Report</li>
              </ul>
              <a className="cta" href="/checkout?type=care&pkg=care-premium&plan=Premium+Care&amount=599&period=mo">Get Premium Care</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="faq" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>Care Plan FAQ</h2>
            <p>Anything else, just ask us on WhatsApp.</p>
          </div>
          <div className="faq">
            <details className="faq-item" open>
              <summary>What happens after I sign up?</summary>
              <p>Our team reaches out within 24 hours to get access to your site and confirm exactly what&apos;s covered under your plan.</p>
            </details>
            <details className="faq-item">
              <summary>Does my website need to be hosted with Nadine Cloud?</summary>
              <p>No — Care Plans work with any website, wherever it&apos;s hosted.</p>
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
          <h2>Let us take care of your website</h2>
          <p>We&apos;ll reach out to onboard you within 24 hours of signing up.</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Choose a plan</a>
            <a className="btn-ghost" href="https://wa.me/260770346698?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20ask%20about%20a%20Care%20Plan." target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <Footer
        productsExtra={[
          { href: "/care", label: "Care plans" },
          { href: "/database", label: "Database hosting" },
        ]}
        supportLinks={[
          { href: "/hosting#security", label: "Security" },
          { href: "/care#faq", label: "Help center" },
          { href: "/contact", label: "Contact us" },
        ]}
      />
    </>
  );
}
