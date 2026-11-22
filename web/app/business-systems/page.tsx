import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { SystemArt } from "../components/SolutionArt";

const TITLE = "Pharmacy & Clinic Systems | Nadine Cloud";
const DESCRIPTION =
  "Ready-made business systems already running in Zambian businesses: a Pharmacy System for stock and sales, and a Clinic System for patient records and payments — with nightly encrypted backups.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/business-systems" },
  openGraph: { type: "website", siteName: "Nadine Cloud", title: TITLE, description: DESCRIPTION, url: "https://www.nadinecloud.com/business-systems" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const ask = (system: string) =>
  `mailto:info@nadinecloud.com?subject=${encodeURIComponent(system)}&body=${encodeURIComponent(
    `Hi Nadine Cloud, I'm interested in the ${system}.\n\nBusiness name:\nTown:\nNumber of branches / computers:\nBest time for a demo:\n`
  )}`;

const SYSTEMS = [
  {
    id: "pharmacy", name: "Pharmacy System", price: 350, setup: 1500,
    for: "For pharmacies and drug stores",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={4} y={4} width={16} height={16} rx={3} /><path d="M12 8v8M8 12h8" /></svg>,
    perks: ["Stock with batch & expiry date tracking", "Fast sales counter with receipts", "Low-stock and expiry alerts", "Daily, weekly and monthly sales reports", "Staff logins — who sold what", "Works on your computer + safe online backup", "Free updates and support by email"],
  },
  {
    id: "clinic", name: "Clinic System", price: 900, setup: 2500, featured: true,
    for: "For clinics, opticians and medical practices",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5z" /></svg>,
    perks: ["Patient records and visit history", "Payments, receipts and balances", "Staff PINs and permissions", "Desktop app + phone app for staff", "Several branches, one shared record", "Nightly encrypted off-site backups", "Free updates and support by email"],
  },
];

export default function BusinessSystems() {
  return (
    <>
      <Header getStartedHref="/business-systems#systems" />

      <section className="page-hero tp-hero sol-hero">
        <div className="wrap sol-hero-grid">
        <div className="page-hero-inner sol-hero-text">
          <span className="eyebrow">New · Business Systems by Nadine Technologies</span>
          <h1>Ready-made systems, already trusted by Zambian businesses.</h1>
          <p>
            Our Pharmacy System and Clinic System are already running every day in real businesses. Get the same proven system for your
            business — set up for you, with your staff trained, and your data backed up safely every night.
          </p>
          <div className="actions" style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="btn-primary" href="#systems">See the systems</a>
            <a className="btn-ghost" href={ask("business systems (free demo)")} target="_blank" rel="noopener">Book a free demo</a>
          </div>
        </div>
        <SystemArt />
        </div>
      </section>

      <section className="section pricing" id="systems" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Systems</span>
            <h2>Choose your system</h2>
            <p>Prices are per month, plus a one-time setup fee that covers installation and staff training. Pay by mobile money or bank.</p>
          </div>
          <div className="plans" style={{ maxWidth: 820, margin: "0 auto" }}>
            {SYSTEMS.map((s) => (
              <div className={s.featured ? "plan featured" : "plan"} key={s.id} id={s.id}>
                <div className="plan-icon">{s.icon}</div>
                <h3>{s.name}</h3>
                <div className="for">{s.for}</div>
                <div className="price">
                  <span className="amt amt-live" data-zmw={s.price}>ZMW {s.price.toLocaleString("en-ZM")}</span> <span className="per">/month</span>
                  <small className="price-note" hidden></small>
                  <div className="for" style={{ marginTop: 6, fontWeight: 600 }}>+ ZMW {s.setup.toLocaleString("en-ZM")} one-time setup &amp; training</div>
                </div>
                <ul>
                  {s.perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
                <a className="cta" href={ask(s.name)} target="_blank" rel="noopener">Get started</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section sol-dots">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Why our systems</span>
            <h2>Built for how businesses here really work</h2>
          </div>
          <div className="services-grid">
            <div className="svc">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#1769FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></div>
              <h3>Proven, not experimental</h3>
              <p>These systems already run every day in real pharmacies and clinics, so you get something tested and dependable.</p>
            </div>
            <div className="svc">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#1769FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={4} y={10} width={16} height={11} rx={2} /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg></div>
              <h3>Your data stays safe</h3>
              <p>Strong logins, encrypted storage and automatic backups every night — even if a computer breaks, nothing is lost.</p>
            </div>
            <div className="svc">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#1769FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H8l-4 4z" /></svg></div>
              <h3>Real support</h3>
              <p>We install it, train your staff and keep improving it. Email support@nadinecloud.com and a real person replies.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="faq" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>Business Systems FAQ</h2>
          </div>
          <div className="faq">
            <details className="faq-item" open>
              <summary>Does it work if the internet goes off?</summary>
              <p>Yes. The system keeps working on your computer, and everything is copied to your online backup as soon as the internet is back.</p>
            </details>
            <details className="faq-item">
              <summary>Can you move our existing records in?</summary>
              <p>Yes. Send us your current records (Excel, another system or paper lists) and we&apos;ll help bring them into your new system during setup.</p>
            </details>
            <details className="faq-item">
              <summary>Do I need special computers?</summary>
              <p>No. Any normal Windows computer works, and the clinic phone app runs on Android phones.</p>
            </details>
            <details className="faq-item">
              <summary>Can I see it before I pay?</summary>
              <p>Of course — book a free demo and we&apos;ll show you the system working with sample data.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Free demo</span>
          <h2>See it working before you decide</h2>
          <p>Email us and we&apos;ll arrange a free demo for your business.</p>
          <div className="actions">
            <a className="btn-primary" href={ask("business systems (free demo)")} target="_blank" rel="noopener">Book a free demo</a>
            <a className="btn-ghost" href="/contact">Contact us</a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
