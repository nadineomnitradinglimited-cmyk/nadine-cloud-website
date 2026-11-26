import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Hosting Plans — Nadine Cloud";
const DESCRIPTION =
  "Fast NVMe hosting with free SSL, automatic backups, deploy from GitHub and an easy control panel. Flexible monthly to 3-year billing, shown in your local currency — no surprises.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/hosting" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/hosting",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};


// One place for the four hosting plans (prices in ZMW per month; checkout and billing use the same numbers).
const PLANS = [
  { pkg: "avara", name: "Avara", zmw: 99, intro: 50, popular: false,
    forWho: "Everything you need for your first website.",
    key: ["1 website", "5 GB NVMe storage", "25 GB bandwidth", "5 email accounts"],
    build: ["Deploy from GitHub", "Upload your files", "WordPress ready"],
    also: ["2 databases", "Free SSL", "Standard support"],
    bestFor: ["First website", "Portfolios", "Landing pages"] },
  { pkg: "elora", name: "Elora", zmw: 179, popular: true,
    forWho: "More room for growing businesses and online shops.",
    key: ["1 website", "10 GB NVMe storage", "75 GB bandwidth", "15 email accounts"],
    build: ["Deploy from GitHub", "Upload your files", "WordPress ready"],
    also: ["5 databases", "Free SSL", "Standard support"],
    bestFor: ["Small businesses", "Online shops", "Busy blogs"] },
  { pkg: "veyra", name: "Veyra", zmw: 299, popular: false,
    forWho: "For businesses running more than one website.",
    key: ["3 websites", "20 GB NVMe storage", "150 GB bandwidth", "30 email accounts"],
    build: ["Deploy from GitHub", "Sitejet Website Builder", "WordPress ready"],
    also: ["10 databases", "Free SSL", "Priority support"],
    bestFor: ["Several websites", "Growing teams", "Lodges & hotels"] },
  { pkg: "zyra", name: "Zyra", zmw: 499, popular: false,
    forWho: "Our most powerful plan for busy sites and agencies.",
    key: ["5 websites", "40 GB NVMe storage", "300 GB bandwidth", "50 email accounts"],
    build: ["Deploy from GitHub", "Sitejet Website Builder", "WordPress ready"],
    also: ["20 databases", "Free SSL", "Premium support"],
    bestFor: ["Agencies", "High-traffic sites", "Many mailboxes"] },
];

export default function Hosting() {
  return (
    <>
      <Header />

      <section className="page-hero has-photo">
        <img src="/assets/hero-hosting.jpg" alt="" className="page-hero-photo" aria-hidden="true" />
        <div className="wrap page-hero-inner">
          <span className="eyebrow">One Cloud. Endless Possibilities.</span>
          <h1>Hosting plans built to grow with your business.</h1>
          <p>From your first website to running several — pick a plan, launch today, upgrade anytime.</p>
        </div>
      </section>

      <section className="section pricing pricing-v2" id="hosting" data-default-period="yr">
        <div className="wrap">
          <div className="section-head" style={{ textAlign: "center", marginLeft: "auto", marginRight: "auto" }}>
            <span className="eyebrow">Nadine Cloud Hosting</span>
            <h2>Pick your plan. Go live today.</h2>
            <p>Every plan comes with free SSL, free migration, automatic backups and the easy Nadine Cloud control panel. Pay by mobile money or card.</p>
          </div>
          <div className="billing-toggle" role="group" aria-label="Billing period">
            <button type="button" className="billing-opt" data-period="mo">Monthly</button>
            <button type="button" className="billing-opt" data-period="6mo">6 Months<span className="save-tag">Save 10%</span></button>
            <button type="button" className="billing-opt active" data-period="yr">1 Year<span className="save-tag">Save 15%</span></button>
            <button type="button" className="billing-opt" data-period="2yr">2 Years<span className="save-tag">Save 20%</span></button>
            <button type="button" className="billing-opt" data-period="3yr">3 Years<span className="save-tag">Save 25%</span></button>
          </div>
          <p className="v2-domain-note">✓ Pay for 1 year or more and get a <strong>free .com domain</strong> for the first year.</p>
          <div className="plans">
            {PLANS.map((p) => (
              <div className={"plan" + (p.popular ? " featured" : "")} key={p.pkg}>
                <div className="v2-badges"><span className="price-savings v2-save" hidden></span>{p.popular ? <span className="v2-pop">Most popular</span> : null}</div>
                <h3>{p.name}</h3>
                <div className="for">{p.forWho}</div>
                <div className="price">
                  <span className="amt amt-live" data-zmw={p.zmw} {...(p.intro ? { "data-intro-zmw": p.intro } : {})}>ZMW {p.zmw}</span> <span className="per">/month</span><small className="price-note" hidden></small>
                </div>
                {p.intro ? <div className="intro-note" hidden>then <span className="amt-live" data-zmw={p.zmw}>ZMW {p.zmw}</span>/month</div> : null}
                <div className="price-equiv" hidden></div>
                <a className="cta" href={`/checkout?type=hosting&pkg=${p.pkg}&plan=Nadine+Cloud+%E2%80%94+${p.name}&amount=${p.zmw}&period=mo`}>Get {p.name}</a>
                <ul className="v2-key">
                  {p.key.map((k) => <li key={k}><strong>{k}</strong></li>)}
                </ul>
                <div className="v2-label">Build with</div>
                <ul className="v2-list">
                  {p.build.map((k) => <li key={k}>{k}</li>)}
                </ul>
                <div className="v2-label">Also included</div>
                <ul className="v2-list">
                  {p.also.map((k) => <li key={k}>{k}</li>)}
                </ul>
                <div className="other-billing"></div>
              </div>
            ))}
          </div>
          <div className="v2-allplans">
            <div><strong>Included in every plan</strong><span>The essentials, whichever plan you choose.</span></div>
            <ul>
              <li>Free SSL (https)</li>
              <li>Free website migration</li>
              <li>Automatic backups</li>
              <li>Easy control panel</li>
              <li>Deploy from GitHub</li>
              <li>Business email</li>
            </ul>
          </div>
          <div className="v2-trust">
            <div><b>Pay the way you like</b><span>Airtel Money, MTN MoMo, Zamtel Kwacha or card — in Kwacha, with no hidden fees.</span></div>
            <div><b>Fast, secure servers</b><span>NVMe SSD cloud servers, free SSL and automatic backups on every plan.</span></div>
            <div><b>Local support, real people</b><span>A Zambian team that answers by email — and moves your site for free.</span></div>
          </div>
          <p className="pricing-note">* The price shown is per month; you pay the total for the billing period you choose, once, at checkout. Pay by mobile money (Airtel, MTN, Zamtel) or card (Visa / Mastercard), or ask us for a bank transfer.</p>
        </div>
      </section>

      <section className="section" id="choose" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Help me choose</span>
            <h2>Which plan is right for you?</h2>
            <p>Not sure? Start small — you can upgrade anytime and keep everything.</p>
          </div>
          <div className="v2-choose">
            {PLANS.map((p) => (
              <div className="v2-choose-row" key={p.pkg}>
                <div><b>{p.name}</b><span>{p.forWho}</span></div>
                <div className="v2-tags">{p.bestFor.map((t) => <span key={t}>{t}</span>)}</div>
                <a href={`#hosting`}>See {p.name}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="security">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Included</span>
            <h2>Free with every hosting plan</h2>
            <p>No hidden extras — these come standard, whichever plan you choose.</p>
          </div>
          <div className="included-grid">
            <div>Free SSL Certificate</div>
            <div>Free Website Migration</div>
            <div>Easy Nadine Cloud Control Panel</div>
            <div><a href="/deploy" style={{ color: "inherit" }}>Deploy from GitHub, automatically</a></div>
            <div>File Manager &amp; Code Editor</div>
            <div>One-Click Databases (MySQL)</div>
            <div>Business Email Accounts</div>
            <div>Domain &amp; DNS Management</div>
            <div>Automatic Backups</div>
            <div>WordPress Ready</div>
            <div>Mobile Money &amp; Card Payments</div>
            <div>Fast NVMe SSD Cloud Servers</div>
          </div>
        </div>
      </section>

      <section className="section" id="email">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Business email</span>
            <h2>Business email hosting</h2>
            <p>Professional email at your own domain — bundled free with hosting, or on its own.</p>
          </div>
          <div className="plans">
            <div className="plan">
              <h3>Basic Email</h3>
              <div className="for">For small teams</div>
              <div className="price"><span className="amt amt-live" data-zmw="300">ZMW 300</span> <span className="per">/year</span><small className="price-note" hidden></small></div>
              <ul>
                <li>5 Email Accounts</li>
                <li>5 GB Mailbox Storage</li>
                <li>Webmail Access</li>
                <li>IMAP/POP3/SMTP</li>
                <li>Spam Protection</li>
              </ul>
              <a className="cta" href="/checkout?type=email&plan=Basic+Email&amount=300">Get Basic Email</a>
            </div>
            <div className="plan">
              <h3>Business Email</h3>
              <div className="for">For growing teams</div>
              <div className="price"><span className="amt amt-live" data-zmw="600">ZMW 600</span> <span className="per">/year</span><small className="price-note" hidden></small></div>
              <ul>
                <li>20 Email Accounts</li>
                <li>10 GB Mailbox Storage</li>
                <li>IMAP/POP3/SMTP</li>
                <li>Spam &amp; Virus Protection</li>
                <li>Email Forwarding</li>
              </ul>
              <a className="cta" href="/checkout?type=email&plan=Business+Email&amount=600">Get Business Email</a>
            </div>
            <div className="plan">
              <h3>Enterprise Email</h3>
              <div className="for">For larger organisations</div>
              <div className="price"><span className="amt amt-live" data-zmw="1200">ZMW 1,200</span> <span className="per">/year</span><small className="price-note" hidden></small></div>
              <ul>
                <li>Unlimited Email Accounts</li>
                <li>25 GB Mailbox Storage</li>
                <li>IMAP/POP3/SMTP</li>
                <li>Calendar &amp; Contacts</li>
                <li>Priority Support</li>
              </ul>
              <a className="cta" href="/checkout?type=email&plan=Enterprise+Email&amount=1200">Get Enterprise Email</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="faq" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>Hosting FAQ</h2>
            <p>Anything else, just email us at info@nadinecloud.com.</p>
          </div>
          <div className="faq">
            <details className="faq-item" open>
              <summary>Can I upgrade my plan later?</summary>
              <p>Yes — you can move up to a bigger plan at any time. We only charge the prorated difference for the rest of your billing cycle.</p>
            </details>
            <details className="faq-item" id="migrate">
              <summary>Do you migrate my existing website for free?</summary>
              <p>Yes — free website migration is included on every hosting plan, whichever host you&apos;re moving from.</p>
            </details>
            <details className="faq-item" id="python">
              <summary>Can I run a Python, Django or Node.js app?</summary>
              <p>Our hosting plans run websites built with HTML, CSS, JavaScript and PHP — including WordPress and sites exported from website builders. Python (Django, Flask) and Node.js apps aren&apos;t included on these plans yet. Email <a href="mailto:support@nadinecloud.com">support@nadinecloud.com</a> and we&apos;ll recommend the right setup for your app.</p>
            </details>
            <details className="faq-item" id="git">
              <summary>Can I deploy my site from GitHub or GitLab?</summary>
              <p>Yes — and it&apos;s automatic. Open your control panel, choose <strong>Deployments</strong> and paste your GitHub repository link. Your site goes live in under a minute, and every time you push to GitHub it updates by itself. You can even create a database for your site in the same step. <a href="/deploy">See how it works</a>.</p>
            </details>
            <details className="faq-item">
              <summary>What payment methods do you accept?</summary>
              <p>Pay at checkout by mobile money (MTN, Airtel, Zamtel) or card (Visa / Mastercard), or ask us for a bank transfer. Hosting can be billed monthly, or every 6 months, 1, 2 or 3 years for a bigger discount — pick your billing period above the plans.</p>
            </details>
            <details className="faq-item">
              <summary>What happens if my site goes down?</summary>
              <p>We monitor all hosting 24/7 and target 99.9% uptime. If there&apos;s an issue, email us and we&apos;ll respond the same day.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Ready when you are</span>
          <h2>Get your hosting set up today</h2>
          <p>Most accounts are activated the same day you order.</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Choose a plan</a>
            <a className="btn-ghost" href="mailto:info@nadinecloud.com?body=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20sign%20up%20for%20hosting." target="_blank" rel="noopener">Email us</a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
