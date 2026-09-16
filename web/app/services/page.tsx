import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Web Design Services — Nadine Cloud";
const DESCRIPTION =
  "Modern, mobile-first web design for shops, clinics, ministries, schools and NGOs worldwide. Built to convert visitors into customers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/services" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/services",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

export default function Services() {
  return (
    <>
      <Header />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Web design</span>
          <h1>Websites built to bring in business, not just look nice.</h1>
          <p>We design modern, mobile-first websites for shops, clinics, ministries, schools and NGOs worldwide — then host and maintain them ourselves, so nothing falls through the cracks.</p>
        </div>
      </section>

      <section className="section" id="services">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">What&apos;s included</span>
            <h2>Every project, done properly</h2>
            <p>Whether it&apos;s a five-page brochure site or a full web system, every project gets the same care.</p>
          </div>
          <div className="services-grid">
            <div className="svc">
              <div className="ic"><svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FBA30E" strokeWidth={2}><rect x={3} y={4} width={18} height={14} rx={2} /><path d="M3 9h18M8 21h8" /></svg></div>
              <h3>Business websites</h3>
              <p>Clean, fast, mobile-first sites for shops, clinics, schools, ministries and NGOs — designed to convert visitors into customers.</p>
            </div>
            <div className="svc">
              <div className="ic"><svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FBA30E" strokeWidth={2}><path d="M12 3v18M3 12h18" /><circle cx={12} cy={12} r={9} /></svg></div>
              <h3>Brand-led design</h3>
              <p>Custom design concepts tailored to your brand — not a generic template — covering colours, type and imagery.</p>
            </div>
            <div className="svc">
              <div className="ic"><svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FBA30E" strokeWidth={2}><rect x={3} y={3} width={7} height={7} rx={1} /><rect x={14} y={3} width={7} height={7} rx={1} /><rect x={3} y={14} width={7} height={7} rx={1} /><rect x={14} y={14} width={7} height={7} rx={1} /></svg></div>
              <h3>Web systems &amp; portals</h3>
              <p>Booking systems, patient portals, admin dashboards and KYC flows — full applications, not just marketing pages.</p>
            </div>
            <div className="svc">
              <div className="ic"><svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FBA30E" strokeWidth={2}><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 12h6M3 12l3-3M3 12l3 3" /></svg></div>
              <h3>Care &amp; maintenance</h3>
              <p>We host what we build, so updates, backups and small content changes are handled by the same team — no handoff.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>From idea to live site in four steps</h2>
            <p>A straightforward process with no surprises along the way.</p>
          </div>
          <div className="process">
            <div className="step">
              <div className="num">01</div>
              <h3>Discovery</h3>
              <p>We learn about your business, your customers and what the site needs to do — then send a fixed quote.</p>
            </div>
            <div className="step">
              <div className="num">02</div>
              <h3>Design</h3>
              <p>A custom design concept for your review, refined until it looks and feels right for your brand.</p>
            </div>
            <div className="step">
              <div className="num">03</div>
              <h3>Build</h3>
              <p>We build the site, connect your domain and email, and test it across devices before launch.</p>
            </div>
            <div className="step">
              <div className="num">04</div>
              <h3>Launch &amp; support</h3>
              <p>Your site goes live on our hosting, with backups and WhatsApp support on hand whenever you need us.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Start your project</span>
          <h2>Tell us about your business</h2>
          <p>Get a fixed quote for your website within a day — no obligation.</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Request a quote</a>
            <a className="btn-ghost" href="https://wa.me/260964068483?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20a%20quote%20for%20a%20website." target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
