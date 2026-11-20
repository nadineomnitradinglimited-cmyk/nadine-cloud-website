import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Database Hosting — Nadine Cloud";
const DESCRIPTION =
  "Managed PostgreSQL and MySQL database hosting. Secure connections, daily backups and worldwide support — priced in your local currency.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/database" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/database",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

const DB_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx={12} cy={5} rx={8} ry={3} />
    <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
);

export default function Database() {
  return (
    <>
      <Header getStartedHref="/database#plans" />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">One Cloud. Endless Possibilities.</span>
          <h1>Managed database hosting, secure and always online.</h1>
          <p>PostgreSQL and MySQL databases for your app or website — you bring the code, we handle backups, security and uptime.</p>
        </div>
      </section>

      <section className="section pricing" id="plans">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Nadine Cloud Database Hosting</span>
            <h2>Affordable database rates</h2>
            <p>Every plan includes PostgreSQL and MySQL support, daily backups and secure connections. Create and manage your databases yourself from cPanel — no website or hosting plan required.</p>
          </div>
          <div className="plans">
            <div className="plan">
              <div className="plan-icon">{DB_ICON}</div>
              <h3>Starter Package</h3>
              <div className="for">Perfect for small projects and websites</div>
              <div className="price"><span className="amt amt-live" data-zmw="500">ZMW 500</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">2</span><span className="l">Databases</span></div>
                <div><span className="n">1 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>PostgreSQL / MySQL</li>
                <li>Automatic Backups</li>
                <li>Manage via Control Panel</li>
                <li>High Uptime Guarantee</li>
              </ul>
              <a className="cta" href="/checkout?type=database&pkg=dbstarter&plan=Nadine+Cloud+%E2%80%94+Starter+Database&amount=500&period=mo">Get Starter</a>
            </div>
            <div className="plan featured">
              <div className="plan-icon">{DB_ICON}</div>
              <h3>Professional Package</h3>
              <div className="for">Ideal for growing businesses and applications</div>
              <div className="price"><span className="amt amt-live" data-zmw="1000">ZMW 1,000</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">5</span><span className="l">Databases</span></div>
                <div><span className="n">5 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>PostgreSQL / MySQL</li>
                <li>Automatic Backups</li>
                <li>Advanced Management</li>
                <li>Priority Support</li>
              </ul>
              <a className="cta" href="/checkout?type=database&pkg=dbpro&plan=Nadine+Cloud+%E2%80%94+Professional+Database&amount=1000&period=mo">Get Professional</a>
            </div>
            <div className="plan">
              <div className="plan-icon">{DB_ICON}</div>
              <h3>Enterprise Package</h3>
              <div className="for">Built for high-demand and enterprise needs</div>
              <div className="price"><span className="amt amt-live" data-zmw="2000">ZMW 2,000</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">10</span><span className="l">Databases</span></div>
                <div><span className="n">20 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>PostgreSQL / MySQL</li>
                <li>Automatic Backups</li>
                <li>Dedicated Resources</li>
                <li>Premium Support</li>
              </ul>
              <a className="cta" href="/checkout?type=database&pkg=dbenterprise&plan=Nadine+Cloud+%E2%80%94+Enterprise+Database&amount=2000&period=mo">Get Enterprise</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="faq" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>Database Hosting FAQ</h2>
            <p>Anything else, just ask us on WhatsApp.</p>
          </div>
          <div className="faq">
            <details className="faq-item" open>
              <summary>How do I create my database once I sign up?</summary>
              <p>You&apos;ll get a cPanel login by email right after payment. From there, use the MySQL Databases or PostgreSQL Databases wizard to create your database(s) and a database user — up to your plan&apos;s limit. Each database gets its own connection details your app uses directly.</p>
            </details>
            <details className="faq-item">
              <summary>Can I connect to it from my own app or server, hosted elsewhere?</summary>
              <p>Yes — these are standalone databases, not tied to hosting a website with us. Point your app&apos;s connection string at the host, port, database name, username and password shown in cPanel.</p>
            </details>
            <details className="faq-item">
              <summary>What payment methods do you accept?</summary>
              <p>Pay at checkout by mobile money (MTN, Airtel, Zamtel) or card (Visa / Mastercard), or ask us for a bank transfer. Database hosting is billed monthly.</p>
            </details>
            <details className="faq-item">
              <summary>Can I upgrade my plan later?</summary>
              <p>Yes — message us on WhatsApp and we&apos;ll move you up to a bigger plan.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Ready when you are</span>
          <h2>Get your database set up today</h2>
          <p>Most accounts are activated the same day you order.</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Choose a plan</a>
            <a className="btn-ghost" href="https://wa.me/260964068483?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20sign%20up%20for%20database%20hosting." target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <Footer
        productsExtra={[{ href: "/database", label: "Database hosting" }]}
        supportLinks={[
          { href: "/hosting#security", label: "Security" },
          { href: "/database#faq", label: "Help center" },
          { href: "/contact", label: "Contact us" },
        ]}
      />
    </>
  );
}
