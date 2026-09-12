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
              <h3>Nadine Cloud — Orin</h3>
              <div className="for">Perfect for small projects and simple applications</div>
              <div className="price"><span className="amt amt-live" data-zmw="79">ZMW 79</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">1</span><span className="l">Database</span></div>
                <div><span className="n">2 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>PostgreSQL / MySQL</li>
                <li>Daily Backups</li>
                <li>Secure Connection</li>
                <li>Standard Support</li>
              </ul>
              <a className="cta" href="/checkout?type=database&pkg=orin&plan=Nadine+Cloud+%E2%80%94+Orin&amount=79&period=mo">Get Orin</a>
            </div>
            <div className="plan featured">
              <div className="plan-icon">{DB_ICON}</div>
              <h3>Nadine Cloud — Kaia</h3>
              <div className="for">Great for business systems, POS and growing websites</div>
              <div className="price"><span className="amt amt-live" data-zmw="149">ZMW 149</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">3</span><span className="l">Databases</span></div>
                <div><span className="n">5 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>PostgreSQL / MySQL</li>
                <li>Daily Backups</li>
                <li>Secure Connection</li>
                <li>Standard Support</li>
              </ul>
              <a className="cta" href="/checkout?type=database&pkg=kaia&plan=Nadine+Cloud+%E2%80%94+Kaia&amount=149&period=mo">Get Kaia</a>
            </div>
            <div className="plan">
              <div className="plan-icon">{DB_ICON}</div>
              <h3>Nadine Cloud — Velora</h3>
              <div className="for">For growing applications and multiple databases</div>
              <div className="price"><span className="amt amt-live" data-zmw="249">ZMW 249</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">5</span><span className="l">Databases</span></div>
                <div><span className="n">15 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>PostgreSQL / MySQL</li>
                <li>Daily Backups</li>
                <li>Secure Connection</li>
                <li>Priority Support</li>
              </ul>
              <a className="cta" href="/checkout?type=database&pkg=velora&plan=Nadine+Cloud+%E2%80%94+Velora&amount=249&period=mo">Get Velora</a>
            </div>
            <div className="plan">
              <div className="plan-icon">{DB_ICON}</div>
              <h3>Nadine Cloud — Zenix</h3>
              <div className="for">Built for demanding applications and larger data</div>
              <div className="price"><span className="amt amt-live" data-zmw="399">ZMW 399</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">10</span><span className="l">Databases</span></div>
                <div><span className="n">30 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>PostgreSQL / MySQL</li>
                <li>Daily Backups</li>
                <li>Secure Connection</li>
                <li>Premium Support</li>
              </ul>
              <a className="cta" href="/checkout?type=database&pkg=zenix&plan=Nadine+Cloud+%E2%80%94+Zenix&amount=399&period=mo">Get Zenix</a>
            </div>
            <div className="plan">
              <div className="plan-icon">{DB_ICON}</div>
              <h3>Nadine Cloud — Astra</h3>
              <div className="for">For heavier workloads and larger teams</div>
              <div className="price"><span className="amt amt-live" data-zmw="649">ZMW 649</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">20</span><span className="l">Databases</span></div>
                <div><span className="n">60 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>PostgreSQL / MySQL</li>
                <li>Daily Backups</li>
                <li>Secure Connection</li>
                <li>Premium Support</li>
              </ul>
              <a className="cta" href="/checkout?type=database&pkg=astra&plan=Nadine+Cloud+%E2%80%94+Astra&amount=649&period=mo">Get Astra</a>
            </div>
            <div className="plan">
              <div className="plan-icon">{DB_ICON}</div>
              <h3>Nadine Cloud — Vantis</h3>
              <div className="for">Built for large-scale, high-demand applications</div>
              <div className="price"><span className="amt amt-live" data-zmw="999">ZMW 999</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">40</span><span className="l">Databases</span></div>
                <div><span className="n">120 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>PostgreSQL / MySQL</li>
                <li>Daily Backups</li>
                <li>Secure Connection</li>
                <li>Dedicated Support</li>
              </ul>
              <a className="cta" href="/checkout?type=database&pkg=vantis&plan=Nadine+Cloud+%E2%80%94+Vantis&amount=999&period=mo">Get Vantis</a>
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
              <p>Mobile money (MTN, Airtel, Zamtel) at checkout, or bank transfer on request — card payments are coming soon. Database hosting is billed monthly.</p>
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
            <a className="btn-ghost" href="https://wa.me/260770346698?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20sign%20up%20for%20database%20hosting." target="_blank" rel="noopener">Chat on WhatsApp</a>
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
