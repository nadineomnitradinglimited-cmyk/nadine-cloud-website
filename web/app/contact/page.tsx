import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Contact Us — Nadine Cloud";
const DESCRIPTION =
  "Get in touch with Nadine Cloud for web design, hosting or domains. WhatsApp, call or email us — we reply the same day.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/contact" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/contact",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

export default function Contact() {
  return (
    <>
      <Header />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Contact us</span>
          <h1>Let&apos;s get you online.</h1>
          <p>Tell us what you need — a new website, hosting for an existing one, or a domain — and we&apos;ll reply the same day.</p>
        </div>
      </section>

      <section className="section" id="contact">
        <div className="wrap">
          <div className="contact-grid">
            <div className="contact-card">
              <h3>Send us a message</h3>
              <form id="contactForm" className="contact-form">
                <input type="checkbox" name="botcheck" className="hp" tabIndex={-1} autoComplete="off" />
                <label>Name
                  <input type="text" name="name" required />
                </label>
                <label>Email
                  <input type="email" name="email" required />
                </label>
                <label>Phone (optional)
                  <input type="tel" name="phone" />
                </label>
                <label>I&apos;m interested in
                  <select name="interest" defaultValue="Web design">
                    <option>Web design</option>
                    <option>Hosting</option>
                    <option>Domain registration</option>
                    <option>Not sure yet</option>
                  </select>
                </label>
                <label>Message
                  <textarea name="message" rows={5} required></textarea>
                </label>
                <button type="submit" className="btn-primary">Send message</button>
                <p id="formStatus" className="form-status" role="status" aria-live="polite"></p>
              </form>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="contact-card">
                <h3>Visit or call</h3>
                <p><strong>Nadine Cloud</strong><br />Serving clients worldwide</p>
                <a className="mono" href="mailto:info@nadinecloud.com">info@nadinecloud.com</a><br />
                <a className="mono" href="tel:+260964068483">+260 964 068 483</a>
                <br />
                <a className="btn-wa" href="https://wa.me/260964068483?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20get%20my%20business%20online." target="_blank" rel="noopener">Chat on WhatsApp</a>
              </div>
              <div className="contact-card">
                <h3>How ordering works</h3>
                <p><strong>1.</strong> Choose a plan or request a website quote.</p>
                <p><strong>2.</strong> We confirm your order and send an invoice — pay by mobile money, card or bank transfer.</p>
                <p><strong>3.</strong> Your hosting is set up the same day, and design projects start within 48 hours.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
