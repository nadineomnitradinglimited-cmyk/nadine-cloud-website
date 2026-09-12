import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Hosting Plans — Nadine Cloud";
const DESCRIPTION =
  "Fast NVMe cPanel hosting with free SSL, daily backups and WhatsApp support. Flexible monthly to 3-year billing, shown in your local currency — no surprises.";

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

export default function Hosting() {
  return (
    <>
      <Header />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">One Cloud. Endless Possibilities.</span>
          <h1>Hosting plans built to grow with your business.</h1>
          <p>From your first website to running several — pick a plan, launch today, upgrade anytime.</p>
        </div>
      </section>

      <section className="section pricing" id="hosting">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Nadine Cloud Hosting</span>
            <h2>Hosting plans built for your growth</h2>
            <p>Choose the hosting plan that fits your website or business. Pay monthly, or save more with a longer billing period. Every plan includes free SSL, cPanel access, free website migration and worldwide support.</p>
          </div>
          <div className="billing-toggle" role="group" aria-label="Billing period">
            <button type="button" className="billing-opt active" data-period="mo">Monthly</button>
            <button type="button" className="billing-opt" data-period="6mo">6 Months<span className="save-tag">Save 10%</span></button>
            <button type="button" className="billing-opt" data-period="yr">1 Year<span className="save-tag">Save 15%</span></button>
            <button type="button" className="billing-opt" data-period="2yr">2 Years<span className="save-tag">Save 20%</span></button>
            <button type="button" className="billing-opt" data-period="3yr">3 Years<span className="save-tag">Save 25%</span></button>
          </div>
          <div className="plans">
            <div className="plan">
              <div className="plan-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={9} /><path d="M3 12h18M12 3c3 3.5 3 14 0 18-3-4-3-14.5 0-18Z" /></svg></div>
              <h3>Nadine Cloud — Avara</h3>
              <div className="for">Everything you need to get started</div>
              <div className="price"><span className="amt amt-live" data-zmw="99">ZMW 99</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="price-equiv" hidden></div>
              <div className="price-savings" hidden></div>
              <div className="plan-stats">
                <div><span className="n">1</span><span className="l">Website</span></div>
                <div><span className="n">5 GB</span><span className="l">Storage</span></div>
                <div><span className="n">25 GB</span><span className="l">Bandwidth</span></div>
                <div><span className="n">5</span><span className="l">Email accounts</span></div>
              </div>
              <ul>
                <li>2 Databases</li>
                <li>Free SSL Certificate</li>
                <li>Automatic Backups</li>
                <li>cPanel Control Panel</li>
                <li>Standard Support</li>
              </ul>
              <a className="cta" href="/checkout?type=hosting&pkg=avara&plan=Nadine+Cloud+%E2%80%94+Avara&amount=99&period=mo">Get Avara</a>
              <div className="other-billing"></div>
            </div>
            <div className="plan featured">
              <div className="plan-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9l-6.2 3.4 1.6-6.8-5.2-4.6 6.9-.6Z" /></svg></div>
              <h3>Nadine Cloud — Elora</h3>
              <div className="for">Our most popular plan</div>
              <div className="price"><span className="amt amt-live" data-zmw="179">ZMW 179</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="price-equiv" hidden></div>
              <div className="price-savings" hidden></div>
              <div className="plan-stats">
                <div><span className="n">1</span><span className="l">Website</span></div>
                <div><span className="n">10 GB</span><span className="l">Storage</span></div>
                <div><span className="n">75 GB</span><span className="l">Bandwidth</span></div>
                <div><span className="n">15</span><span className="l">Email accounts</span></div>
              </div>
              <ul>
                <li>5 Databases</li>
                <li>Free SSL Certificate</li>
                <li>Automatic Backups</li>
                <li>cPanel Control Panel</li>
                <li>Standard Support</li>
              </ul>
              <a className="cta" href="/checkout?type=hosting&pkg=elora&plan=Nadine+Cloud+%E2%80%94+Elora&amount=179&period=mo">Get Elora</a>
              <div className="other-billing"></div>
            </div>
            <div className="plan">
              <div className="plan-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></svg></div>
              <h3>Nadine Cloud — Veyra</h3>
              <div className="for">For businesses running more than one site</div>
              <div className="price"><span className="amt amt-live" data-zmw="299">ZMW 299</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="price-equiv" hidden></div>
              <div className="price-savings" hidden></div>
              <div className="plan-stats">
                <div><span className="n">3</span><span className="l">Websites</span></div>
                <div><span className="n">20 GB</span><span className="l">Storage</span></div>
                <div><span className="n">150 GB</span><span className="l">Bandwidth</span></div>
                <div><span className="n">30</span><span className="l">Email accounts</span></div>
              </div>
              <ul>
                <li>10 Databases</li>
                <li>Website Builder</li>
                <li>Free SSL Certificate</li>
                <li>Automatic Backups</li>
                <li>Priority Support</li>
              </ul>
              <a className="cta" href="/checkout?type=hosting&pkg=veyra&plan=Nadine+Cloud+%E2%80%94+Veyra&amount=299&period=mo">Get Veyra</a>
              <div className="other-billing"></div>
            </div>
            <div className="plan">
              <div className="plan-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={8} r={6} /><path d="M9 13.5 7 22l5-3 5 3-2-8.5" /></svg></div>
              <h3>Nadine Cloud — Zyra</h3>
              <div className="for">Our most powerful plan</div>
              <div className="price"><span className="amt amt-live" data-zmw="499">ZMW 499</span> <span className="per">/month</span><small className="price-note" hidden></small></div>
              <div className="price-equiv" hidden></div>
              <div className="price-savings" hidden></div>
              <div className="plan-stats">
                <div><span className="n">5</span><span className="l">Websites</span></div>
                <div><span className="n">40 GB</span><span className="l">Storage</span></div>
                <div><span className="n">300 GB</span><span className="l">Bandwidth</span></div>
                <div><span className="n">50</span><span className="l">Email accounts</span></div>
              </div>
              <ul>
                <li>20 Databases</li>
                <li>Website Builder</li>
                <li>Free SSL Certificate</li>
                <li>Automatic Backups</li>
                <li>Premium Support</li>
              </ul>
              <a className="cta" href="/checkout?type=hosting&pkg=zyra&plan=Nadine+Cloud+%E2%80%94+Zyra&amount=499&period=mo">Get Zyra</a>
              <div className="other-billing"></div>
            </div>
          </div>
          <p className="pricing-note">* Prices shown are the total for the selected billing period, charged once at checkout. Pay by mobile money, or bank transfer on request — card payments coming soon.</p>
        </div>
      </section>

      <section className="section" id="security" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Included</span>
            <h2>Free with every hosting plan</h2>
            <p>No hidden extras — these come standard, whichever plan you choose.</p>
          </div>
          <div className="included-grid">
            <div>Free SSL Certificate</div>
            <div>Free Website Migration</div>
            <div>cPanel Control Panel</div>
            <div>Softaculous One-Click Installer</div>
            <div>WordPress Ready</div>
            <div>Daily or Weekly Backups</div>
            <div>Malware Protection</div>
            <div>99.9% Uptime Guarantee</div>
            <div>Worldwide Support</div>
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
            <p>Anything else, just ask us on WhatsApp.</p>
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
              <summary>Can I run a Python or Django app on my hosting?</summary>
              <p>Yes — every hosting plan includes cPanel&apos;s Python app tool, so you can deploy a Django, Flask or other Python web app on your domain, no extra setup fee. Great for most small business apps; if you need background workers (like Celery) or a dedicated server, message us first and we&apos;ll advise on the best fit.</p>
            </details>
            <details className="faq-item">
              <summary>What payment methods do you accept?</summary>
              <p>Mobile money (MTN, Airtel, Zamtel) at checkout, or bank transfer on request — card payments are coming soon. Hosting can be billed monthly, or every 6 months, 1, 2 or 3 years for a bigger discount — pick your billing period above the plans.</p>
            </details>
            <details className="faq-item">
              <summary>What happens if my site goes down?</summary>
              <p>We monitor all hosting 24/7 and target 99.9% uptime. If there&apos;s an issue, message us on WhatsApp and we&apos;ll respond the same day.</p>
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
            <a className="btn-ghost" href="https://wa.me/260770346698?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20sign%20up%20for%20hosting." target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
