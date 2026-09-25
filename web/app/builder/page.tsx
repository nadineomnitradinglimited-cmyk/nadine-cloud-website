import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Website Builder — Nadine Cloud";
const DESCRIPTION =
  "Drag-and-drop Website Builder hosting — build your own site with no coding, free SSL included, priced in your local currency.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/builder" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/builder",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

export default function Builder() {
  return (
    <>
      <Header getStartedHref="/builder#plans" />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">One Cloud. Endless Possibilities.</span>
          <h1>Build your own website, no coding needed.</h1>
          <p>A simple drag-and-drop builder hosted on your own domain, with free SSL included.</p>
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <div className="contact-grid">
            <div>
              <img
                src="/assets/builder-home.jpg"
                alt=""
                style={{ borderRadius: 16, width: "100%", display: "block", boxShadow: "0 1px 2px rgba(11,18,32,.05), 0 12px 30px rgba(11,18,32,.08)" }}
              />
            </div>
            <div>
              <span className="eyebrow">Build from anywhere</span>
              <h2>No designer, no code — just you and your laptop.</h2>
              <p style={{ color: "var(--text-soft)", marginBottom: 14 }}>
                Drag, drop and publish from home, the office, or your phone — your site is hosted and live the
                moment you&apos;re happy with it.
              </p>
              <a className="btn-ghost" href="/builder/generate">Or describe your business and let AI build the first draft →</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section pricing" id="plans">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Nadine Cloud Website Builder</span>
            <h2>One simple plan</h2>
            <p>Perfect if you just want a simple site up fast, without hiring a designer or writing code.</p>
          </div>
          <div className="plans">
            <div className="plan">
              <div className="plan-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={4} width={18} height={16} rx={2} /><path d="M3 9h18M8 4v16" /></svg></div>
              <h3>Nadine Cloud — Builder</h3>
              <div className="for">Already have a domain? Just add hosting.</div>
              <div className="price"><span className="amt amt-live" data-zmw="59">ZMW 59</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">1</span><span className="l">Website</span></div>
                <div><span className="n">2 GB</span><span className="l">Storage</span></div>
              </div>
              <ul>
                <li>10 GB Bandwidth</li>
                <li>Drag-and-Drop Builder</li>
                <li>1 Email Account</li>
                <li>Free SSL Certificate</li>
                <li>Standard Support</li>
              </ul>
              <a className="cta" href="/checkout?type=builder&pkg=builder&plan=Nadine+Cloud+%E2%80%94+Builder&amount=59&period=mo">Get Builder</a>
            </div>
            <div className="plan featured">
              <div className="plan-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9l-6.2 3.4 1.6-6.8-5.2-4.6 6.9-.6Z" /></svg></div>
              <h3>Nadine Cloud — Launch</h3>
              <div className="for">No domain yet? This is the one-payment starter bundle</div>
              <div className="price"><span className="amt amt-live" data-zmw="850">ZMW 850</span> <span className="per">/first year</span><small className="price-note" hidden></small></div>
              <div className="plan-stats">
                <div><span className="n">1</span><span className="l">Free .com domain</span></div>
                <div><span className="n">1</span><span className="l">Year hosting</span></div>
              </div>
              <ul>
                <li>Free .com domain (1st year)</li>
                <li>Drag-and-Drop Website Builder</li>
                <li>Free SSL Certificate</li>
                <li>1 Email Account</li>
                <li>Standard Support</li>
              </ul>
              <a className="cta" href="/checkout?type=bundle&pkg=builder&plan=Nadine+Cloud+%E2%80%94+Launch&amount=850&period=yr">Get Launch</a>
            </div>
          </div>
          <p className="pricing-note">* Launch renews at <span className="amt-live" data-zmw="59">ZMW 59</span>/month for hosting after the first year, plus your domain&apos;s standard renewal price — we&apos;ll remind you before either is due.</p>
        </div>
      </section>

      <section className="section" id="faq" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>Website Builder FAQ</h2>
            <p>Anything else, just ask us on WhatsApp.</p>
          </div>
          <div className="faq">
            <details className="faq-item" open>
              <summary>Do I need my own domain?</summary>
              <p>Yes — bring your own domain (or buy one from us) and we&apos;ll connect it to your Website Builder site.</p>
            </details>
            <details className="faq-item">
              <summary>How soon can I start building?</summary>
              <p>Your cPanel account is ready right after payment; Website Builder access is switched on within a few hours and you&apos;ll get a follow-up email once it&apos;s live.</p>
            </details>
            <details className="faq-item">
              <summary>What payment methods do you accept?</summary>
              <p>Pay at checkout by mobile money (MTN, Airtel, Zamtel) or card (Visa / Mastercard), or ask us for a bank transfer.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Ready when you are</span>
          <h2>Start building your site today</h2>
          <p>Most accounts are activated the same day you order.</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Get started</a>
            <a className="btn-ghost" href="https://wa.me/260964068483?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20sign%20up%20for%20Website%20Builder." target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <Footer
        productsExtra={[
          { href: "/builder", label: "Website Builder" },
          { href: "/database", label: "Database hosting" },
        ]}
        supportLinks={[
          { href: "/hosting#security", label: "Security" },
          { href: "/builder#faq", label: "Help center" },
          { href: "/contact", label: "Contact us" },
        ]}
      />
    </>
  );
}
