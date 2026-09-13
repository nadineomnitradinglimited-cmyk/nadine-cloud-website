import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "About Us — Nadine Cloud";
const DESCRIPTION =
  "Nadine Cloud is a remote-first team building, hosting and supporting websites for businesses worldwide — with real people behind the support, 24/7.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/about" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/about",
    images: ["https://www.nadinecloud.com/assets/team-support.jpeg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/team-support.jpeg"],
  },
};

export default function About() {
  return (
    <>
      <Header />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">About us</span>
          <h1>One team, everything your business needs online.</h1>
          <p>Nadine Cloud is a service of Nadine Omni Trading Limited — we design, host and support websites for businesses worldwide, so you never have to juggle separate providers for your site, your domain, your email and your hosting.</p>
        </div>
      </section>

      <section className="section" id="team">
        <div className="wrap">
          <div className="contact-grid">
            <div>
              <img
                src="/assets/team-support.jpeg"
                alt="A member of the Nadine Cloud support team standing in front of the company's servers"
                style={{ borderRadius: 16, width: "100%", display: "block", boxShadow: "0 1px 2px rgba(11,18,32,.05), 0 12px 30px rgba(11,18,32,.08)" }}
              />
            </div>
            <div>
              <span className="eyebrow">Real people, not just a chatbot</span>
              <h2>24/7 human support, whenever you need us.</h2>
              <p style={{ color: "var(--text-soft)", marginBottom: 14 }}>
                Our site has a chat assistant to answer quick questions any time of day — but behind it is a real
                team, reachable on WhatsApp, email and calls, worldwide. If the bot can&apos;t help, a person always
                can.
              </p>
              <p style={{ color: "var(--text-soft)", marginBottom: 22 }}>
                Whether you&apos;re setting up your first website or your hosting needs urgent attention, you&apos;re
                talking to the same team that builds and manages the infrastructure — not a call center reading from
                a script.
              </p>
              <a
                className="btn-wa"
                href="https://wa.me/260770346698?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20get%20in%20touch."
                target="_blank"
                rel="noopener"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">What we do</span>
            <h2>Everything a business needs to get online, in one place</h2>
            <p>Website design, cloud hosting, domains, business email, databases and marketing — handled by the same team, so you get one invoice and one point of contact instead of juggling providers.</p>
          </div>
          <div className="included-grid">
            <div>Web design &amp; custom systems</div>
            <div>Fast, secure NVMe hosting</div>
            <div>Domain registration &amp; DNS</div>
            <div>Business email hosting</div>
            <div>Managed databases</div>
            <div>SEO, social &amp; paid ads</div>
            <div>Free SSL on every site</div>
            <div>Worldwide, remote-first support</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">How we work</span>
            <h2>Remote-first, worldwide</h2>
            <p>Every website, hosting account and support conversation happens online — wherever your business is, we can build it, host it and support it.</p>
          </div>
          <div className="network-list">
            <div>100% remote — no office visit required</div>
            <div>WhatsApp, email and calls, wherever you are</div>
            <div>Prices shown in your local currency</div>
            <div>Real people behind every support conversation</div>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Let&apos;s talk</span>
          <h2>Have a question before you get started?</h2>
          <p>Message us and a real person on our team will reply the same day.</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Contact us</a>
            <a
              className="btn-ghost"
              href="https://wa.me/260770346698?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20know%20more%20about%20your%20company."
              target="_blank"
              rel="noopener"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
