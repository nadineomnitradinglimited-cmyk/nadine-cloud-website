import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FlowArt } from "../components/SolutionArt";

const TITLE = "Business Automation | Nadine Cloud";
const DESCRIPTION =
  "Let your business run itself: automatic invoices and payment reminders, daily reports, alerts, follow-up emails and backups — set up and looked after by Nadine Technologies.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/automation" },
  openGraph: { type: "website", siteName: "Nadine Cloud", title: TITLE, description: DESCRIPTION, url: "https://www.nadinecloud.com/automation" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const ask = (what: string) =>
  `mailto:info@nadinecloud.com?subject=${encodeURIComponent(`Automation — ${what}`)}&body=${encodeURIComponent(
    `Hi Nadine Cloud, I'd like to automate part of my business (${what}).\n\nBusiness name:\nWhat takes your team the most time every week?\n`
  )}`;

const ICON = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#1769FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const IDEAS = [
  { t: "Invoices & payment reminders", d: "Invoices go out by themselves, with a mobile money “Pay now” link, and polite reminders before and after the due date.", i: "M6 2h9l3 3v17H6zM9 9h6M9 13h6M9 17h4" },
  { t: "Daily & weekly reports", d: "Sales, stock, bookings or cash summaries land in your inbox every morning — no one has to put them together.", i: "M4 19h16M7 16V9M12 16V5M17 16v-4" },
  { t: "Instant alerts", d: "Get told straight away when stock runs low, a big payment arrives, a website goes down or something needs a decision.", i: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" },
  { t: "Follow-up emails", d: "Thank-you messages, renewal reminders and “we miss you” emails sent automatically at the right moment.", i: "M4 6h16v12H4zM4 7l8 6 8-6" },
  { t: "Automatic backups", d: "Your business data copied every night, encrypted, to safe off-site storage — tested and watched for you.", i: "M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3" },
  { t: "Connecting your systems", d: "Your website, payments, stock and accounts talking to each other, so data is typed in once — not three times.", i: "M8 12h8M5 9a3 3 0 1 0 0 6M19 9a3 3 0 1 1 0 6" },
];

const PLANS = [
  { name: "Starter", price: 500, setup: 1000, for: "One or two time-savers", perks: ["Up to 2 automations", "e.g. invoice reminders + a daily report", "Monitoring that they keep running", "Small changes each month", "Support by email"] },
  { name: "Business", price: 1200, setup: 2500, featured: true, for: "Run the routine work on autopilot", perks: ["Up to 6 automations", "Alerts, reports, reminders and follow-ups", "Connected to your systems and payments", "Monthly review: what else to automate", "Priority support"] },
  { name: "Custom", price: 0, setup: 0, for: "Bigger projects and whole workflows", perks: ["Designed around your business", "Any number of automations", "Integration with your existing software", "Fixed quote before we start", "Ongoing care plan available"] },
];

export default function Automation() {
  return (
    <>
      <Header getStartedHref="/automation#plans" />

      <section className="page-hero tp-hero sol-hero">
        <div className="wrap sol-hero-grid">
        <div className="page-hero-inner sol-hero-text">
          <span className="eyebrow">New · Business Automation by Nadine Technologies</span>
          <h1>Stop doing the same work by hand every day.</h1>
          <p>
            We find the jobs your team repeats — sending invoices, chasing payments, writing reports, checking stock — and make them happen
            automatically. The same tools already run Nadine Cloud&apos;s own invoices, reminders, alerts and backups.
          </p>
          <div className="actions" style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="btn-primary" href="#plans">See plans</a>
            <a className="btn-ghost" href={ask("free assessment")} target="_blank" rel="noopener">Free assessment</a>
          </div>
        </div>
        <FlowArt />
        </div>
      </section>

      <section className="section sol-dots">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">What we automate</span>
            <h2>Popular automations</h2>
          </div>
          <div className="tp-grid tp-3">
            {IDEAS.map((x) => (
              <div className="tp-card" key={x.t}>
                <span className="tp-ic" style={{ background: "#EAF2FF" }}>{ICON(x.i)}</span>
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section pricing" id="plans" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Plans</span>
            <h2>Pick how much you want to automate</h2>
            <p>Prices are per month, plus a one-time setup fee. Pay by mobile money or bank.</p>
          </div>
          <div className="plans">
            {PLANS.map((p) => (
              <div className={p.featured ? "plan featured" : "plan"} key={p.name}>
                <h3>{p.name}</h3>
                <div className="for">{p.for}</div>
                <div className="price">
                  {p.price ? (
                    <>
                      <span className="amt amt-live" data-zmw={p.price}>ZMW {p.price.toLocaleString("en-ZM")}</span> <span className="per">/month</span>
                      <small className="price-note" hidden></small>
                  <div className="for" style={{ marginTop: 6, fontWeight: 600 }}>+ ZMW {p.setup.toLocaleString("en-ZM")} one-time setup</div>
                    </>
                  ) : (
                    <span className="amt">Quote</span>
                  )}
                </div>
                <ul>
                  {p.perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
                <a className="cta" href={ask(p.name)} target="_blank" rel="noopener">{p.price ? "Get started" : "Ask for a quote"}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Free assessment</span>
          <h2>What could your business stop doing by hand?</h2>
          <p>Tell us what takes your team the most time and we&apos;ll suggest what to automate — free.</p>
          <div className="actions">
            <a className="btn-primary" href={ask("free assessment")} target="_blank" rel="noopener">Get a free assessment</a>
            <a className="btn-ghost" href="/contact">Contact us</a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
