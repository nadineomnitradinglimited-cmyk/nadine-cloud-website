import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Managed WordPress Hosting — Nadine Cloud";
const DESCRIPTION =
  "Managed WordPress hosting with staging, automatic updates and daily backups. Fast, secure, and priced in your local currency.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/wordpress" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/wordpress",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

export default function WordPress() {
  return (
    <>
      <Header getStartedHref="/wordpress#plans" />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">One Cloud. Endless Possibilities.</span>
          <h1>Managed WordPress hosting, built for speed.</h1>
          <p>WordPress pre-installed, automatic updates, staging sites and daily backups — you focus on content, we handle the rest.</p>
        </div>
      </section>

      <section className="section pricing" id="plans">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Nadine Cloud Managed WordPress</span>
            <h2>WordPress hosting plans</h2>
            <p>Every plan includes free SSL, daily backups and cPanel access. WordPress is installed for you — no setup required.</p>
          </div>
          <div className="plans">
            <div className="plan">
              <div className="plan-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={9} /><path d="M3 12h18M12 3c3 3.5 3 14 0 18-3-4-3-14.5 0-18Z" /></svg></div>
              <h3>Nadine Cloud — WP Starter</h3>
              <div className="for">Perfect for a first WordPress site</div>
              <div className="price"><span className="amt amt-live" data-zmw="149">ZMW 149</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">1</span><span className="l">WP Site</span></div>
                <div><span className="n">10 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>50 GB Bandwidth</li>
                <li>Daily Backups</li>
                <li>Free SSL Certificate</li>
                <li>Standard Support</li>
              </ul>
              <a className="cta" href="/checkout?type=wordpress&pkg=wpstarter&plan=Nadine+Cloud+%E2%80%94+WP+Starter&amount=149&period=mo">Get WP Starter</a>
            </div>
            <div className="plan featured">
              <div className="plan-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9l-6.2 3.4 1.6-6.8-5.2-4.6 6.9-.6Z" /></svg></div>
              <h3>Nadine Cloud — WP Growth</h3>
              <div className="for">Our most popular WordPress plan</div>
              <div className="price"><span className="amt amt-live" data-zmw="279">ZMW 279</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">1</span><span className="l">WP Site</span></div>
                <div><span className="n">20 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>100 GB Bandwidth</li>
                <li>Staging Site</li>
                <li>Weekly Malware Scan</li>
                <li>Priority Support</li>
              </ul>
              <a className="cta" href="/checkout?type=wordpress&pkg=wpgrowth&plan=Nadine+Cloud+%E2%80%94+WP+Growth&amount=279&period=mo">Get WP Growth</a>
            </div>
            <div className="plan">
              <div className="plan-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></svg></div>
              <h3>Nadine Cloud — WP Pro</h3>
              <div className="for">For agencies and multiple WordPress sites</div>
              <div className="price"><span className="amt amt-live" data-zmw="449">ZMW 449</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">3</span><span className="l">WP Sites</span></div>
                <div><span className="n">40 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>200 GB Bandwidth</li>
                <li>Staging Site</li>
                <li>Automatic Core &amp; Plugin Updates</li>
                <li>Premium Support</li>
              </ul>
              <a className="cta" href="/checkout?type=wordpress&pkg=wppro&plan=Nadine+Cloud+%E2%80%94+WP+Pro&amount=449&period=mo">Get WP Pro</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="faq" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>Managed WordPress FAQ</h2>
            <p>Anything else, just ask us on WhatsApp.</p>
          </div>
          <div className="faq">
            <details className="faq-item" open>
              <summary>Is WordPress already installed when I sign up?</summary>
              <p>We install it for you right after payment — you&apos;ll get your cPanel login immediately, and a separate email with your WordPress admin login within a few hours.</p>
            </details>
            <details className="faq-item">
              <summary>Can I migrate my existing WordPress site to you?</summary>
              <p>Yes — free migration is included, whichever host you&apos;re moving from.</p>
            </details>
            <details className="faq-item">
              <summary>What payment methods do you accept?</summary>
              <p>Pay at checkout by mobile money (MTN, Airtel, Zamtel) or card (Visa / Mastercard), or ask us for a bank transfer. WordPress hosting is billed monthly.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Ready when you are</span>
          <h2>Get your WordPress site hosted today</h2>
          <p>Most accounts are activated the same day you order.</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Choose a plan</a>
            <a className="btn-ghost" href="https://wa.me/260964068483?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20sign%20up%20for%20WordPress%20hosting." target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <Footer
        productsExtra={[
          { href: "/wordpress", label: "Managed WordPress" },
          { href: "/database", label: "Database hosting" },
        ]}
        supportLinks={[
          { href: "/hosting#security", label: "Security" },
          { href: "/wordpress#faq", label: "Help center" },
          { href: "/contact", label: "Contact us" },
        ]}
      />
    </>
  );
}
