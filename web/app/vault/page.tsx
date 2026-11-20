import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Nadine Vault — Cloud storage for your phone | Nadine Cloud";
const DESCRIPTION =
  "Nadine Vault keeps your photos, videos and documents safe in the cloud. Start with 2 GB free, back up your phone automatically and pay for more space with mobile money.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/vault" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/vault",
    images: ["https://www.nadinecloud.com/assets/vault-banner.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/vault-banner.png"],
  },
};

const WA_EARLY =
  "mailto:info@nadinecloud.com?body=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20early%20access%20to%20Nadine%20Vault.";
const waPlan = (name: string) =>
  `mailto:info@nadinecloud.com?body=${encodeURIComponent(`Hi Nadine Cloud, I'd like the Nadine Vault ${name} plan.`)}`;

const CLOUD_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 18a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 8.5a4.5 4.5 0 0 1-.5 9.5H7Z" />
  </svg>
);

const PLANS = [
  { name: "Orbit", gb: "2 GB", price: 0, for: "Try it free — for your most important files" },
  { name: "Luna", gb: "10 GB", price: 25, for: "For everyday phone backups" },
  { name: "Nova", gb: "50 GB", price: 75, for: "Room for years of photos and videos", featured: true },
  { name: "Nebula", gb: "100 GB", price: 120, for: "For families and small businesses" },
  { name: "Galaxy VIP", gb: "500 GB", price: 350, for: "For creators and heavy users" },
];
const PERKS = ["Photo & video backup", "Any type of file", "Fingerprint lock", "Encrypted storage"];

export default function Vault() {
  return (
    <>
      <Header getStartedHref="/vault#plans" />

      <section className="section vault-band" style={{ borderTop: "none" }}>
        <div className="wrap vault-grid">
          <div>
            <img className="vault-logo" src="/assets/vault-icon.png" alt="Nadine Vault app icon" width={56} height={56} />
            <span className="eyebrow">New · Nadine Vault by Nadine Cloud</span>
            <h1 style={{ fontSize: "clamp(34px,5vw,54px)", fontWeight: 800, letterSpacing: "-.02em", margin: "10px 0 14px", color: "#fff" }}>
              Your files. Your space. <span style={{ color: "#7FC4FF" }}>Anywhere.</span>
            </h1>
            <p className="lead">
              Nadine Vault backs up your photos, videos and documents to the cloud, so they&apos;re safe even if your phone is lost, stolen or broken.
              Start with 2 GB free and add more space whenever you need it.
            </p>
            <ul className="vault-points">
              <li>2 GB free, forever</li>
              <li>Automatic photo &amp; video backup</li>
              <li>Upload and open any file</li>
              <li>Fingerprint app lock</li>
              <li>Encrypted storage</li>
              <li>Pay with MTN, Airtel or Zamtel</li>
            </ul>
            <div className="vault-actions">
              <a className="btn-primary has-new" href={WA_EARLY} target="_blank" rel="noopener">
                Get early access <span className="new-tag">New</span>
              </a>
              <a className="btn-ghost" href="#plans">See storage plans</a>
            </div>
            <span className="vault-soon">Android app · coming soon to Google Play</span>
          </div>
          <div className="vault-phone">
            <img src="/assets/vault-home.png" alt="Nadine Vault home screen showing storage used and recent files" width={390} height={844} />
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>Safe in three simple steps</h2>
          </div>
          <div className="services-grid">
            <div className="svc">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1769FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x={7} y={2} width={10} height={20} rx={2} />
                  <path d="M11 18h2" />
                </svg>
              </div>
              <h3>1. Install &amp; sign up</h3>
              <p>Download the app, create your account and you instantly get 2 GB of free space.</p>
            </div>
            <div className="svc">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1769FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4m0 0-4 4m4-4 4 4" />
                  <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
              </div>
              <h3>2. Turn on backup</h3>
              <p>Your photos and videos upload on their own over Wi-Fi. Add any other file with one tap.</p>
            </div>
            <div className="svc">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1769FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x={4} y={10} width={16} height={11} rx={2} />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </div>
              <h3>3. Open them anywhere</h3>
              <p>Your files stay locked behind your password and fingerprint, ready whenever you need them.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section pricing vault-plans" id="plans" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Storage plans</span>
            <h2>Start free. Grow when you need to.</h2>
            <p>All prices are per month. Pay inside the app with Nadine Pay — mobile money (MTN, Airtel, Zamtel).</p>
          </div>
          <div className="plans">
            {PLANS.map((p) => (
              <div className={p.featured ? "plan featured" : "plan"} key={p.name}>
                <div className="plan-icon">{CLOUD_ICON}</div>
                <h3>{p.name}</h3>
                <div className="for">{p.for}</div>
                <div className="price">
                  {p.price === 0 ? (
                    <span className="amt">Free</span>
                  ) : (
                    <>
                      <span className="amt amt-live" data-zmw={p.price}>ZMW {p.price}</span> <span className="per">/month</span>
                      <small className="price-note" hidden></small>
                    </>
                  )}
                </div>
                <div className="plan-stats">
                  <div><span className="n">{p.gb}</span><span className="l">Storage</span></div>
                </div>
                <ul>
                  {PERKS.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
                <a className="cta" href={p.price === 0 ? WA_EARLY : waPlan(p.name)} target="_blank" rel="noopener">
                  {p.price === 0 ? "Start free" : `Choose ${p.name.replace(" VIP", "")}`}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>Nadine Vault FAQ</h2>
          </div>
          <div className="faq">
            <details className="faq-item" open>
              <summary>When can I download the app?</summary>
              <p>Nadine Vault for Android is launching on Google Play soon. Email us for early access and we&apos;ll let you know the moment it&apos;s live. An iPhone and computer version will follow.</p>
            </details>
            <details className="faq-item">
              <summary>Where are my files stored?</summary>
              <p>Your files are encrypted and stored in a secure, professional data centre in the European Union (Amsterdam). Only you can see them — we never sell or share your files.</p>
            </details>
            <details className="faq-item">
              <summary>How do I pay for more space?</summary>
              <p>Inside the app, choose a plan and pay with mobile money through Nadine Pay. Your extra space is ready straight away. Plans are billed per month.</p>
            </details>
            <details className="faq-item">
              <summary>What happens if I lose my phone?</summary>
              <p>Just install Nadine Vault on your new phone and sign in — all your backed-up photos, videos and files are still there.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Be the first</span>
          <h2>Get Nadine Vault early</h2>
          <p>Join the early-access list and start with 2 GB free.</p>
          <div className="actions">
            <a className="btn-primary" href={WA_EARLY} target="_blank" rel="noopener">Get early access by email</a>
            <a className="btn-ghost" href="/contact">Contact us</a>
          </div>
        </div>
      </section>

      <Footer productsExtra={[{ href: "/vault", label: "Nadine Vault" }]} />
    </>
  );
}
