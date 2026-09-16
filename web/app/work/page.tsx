import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Our Portfolio — Nadine Cloud";
const DESCRIPTION =
  "Building powerful digital solutions for businesses worldwide — websites, web applications, and business management systems that help organizations grow.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/work" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/work",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

export default function Work() {
  return (
    <>
      <Header />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Our portfolio</span>
          <h1>Building powerful digital solutions for businesses worldwide.</h1>
          <p>At Nadine Cloud, we specialize in designing, developing, and hosting modern websites, web applications, and business management systems that help organizations grow.</p>
        </div>
      </section>

      <section className="section" id="work">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Featured projects</span>
            <h2>Built by us, trusted by clients</h2>
          </div>
          <div className="portfolio-grid">
            <div className="work"><b>Royal South Luangwa Safari Lodge</b><span>Luxury safari lodge website with a modern responsive design and Progressive Web App (PWA).</span><br /><span className="tag">Tourism</span></div>
            <div className="work"><b>Nadine Express Cargo</b><span>Freight forwarding and cargo tracking platform with shipment management and customer services.</span><br /><span className="tag">Logistics</span></div>
            <div className="work"><b>Urban Ex Logistics</b><span>Freight forwarding company website for shipping between China and Zambia.</span><br /><span className="tag">Logistics</span></div>
            <div className="work"><b>Nadify B2B</b><span>Business-to-business marketplace connecting suppliers and buyers with integrated logistics.</span><br /><span className="tag">Marketplace</span></div>
            <div className="work"><b>Optic Zone Opticians</b><span>Patient management system with appointment scheduling, prescriptions, customer database, and reporting.</span><br /><span className="tag">Healthcare</span></div>
            <div className="work"><b>MedMorph Pharmacy</b><span>Pharmacy management system featuring inventory control, sales, patient records, and reporting.</span><br /><span className="tag">Pharmacy</span></div>
            <div className="work"><b>Destined for Greatness Ministries</b><span>Church website with live sermon streaming, a media library, and online giving.</span><br /><span className="tag">Church</span></div>
            <div className="work"><b>Chatbot Money Lenders</b><span>Money lending platform website with online loan applications and customer support.</span><br /><span className="tag">Finance</span></div>
            <div className="work"><b>ZMRS</b><span>Corporate website for a mining company.</span><br /><span className="tag">Mining</span></div>
            <div className="work"><b>Zeton Investments</b><span>Corporate website for a Zambian investment house raising capital and facilitating trade across infrastructure and energy projects.</span><br /><span className="tag">Finance</span></div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Beyond websites</span>
            <h2>Other solutions we&apos;ve delivered</h2>
            <p>Custom software built around how your business actually works.</p>
          </div>
          <div className="chip-row">
            <span className="chip">Corporate Websites</span>
            <span className="chip">E-Commerce Websites</span>
            <span className="chip">Progressive Web Apps (PWAs)</span>
            <span className="chip">School Management Systems</span>
            <span className="chip">Point of Sale (POS) Systems</span>
            <span className="chip">Inventory &amp; Stock Management Systems</span>
            <span className="chip">Accounting &amp; Business Management Systems</span>
            <span className="chip">Pharmacy Management Systems</span>
            <span className="chip">Medical &amp; Patient Database Systems</span>
            <span className="chip">Church Websites</span>
            <span className="chip">Custom Web Applications</span>
            <span className="chip">Company Portals</span>
            <span className="chip">Domain Registration</span>
            <span className="chip">Business Email Hosting</span>
            <span className="chip">Web Hosting Solutions</span>
            <span className="chip">Website Maintenance &amp; Support</span>
            <span className="chip">Branding &amp; Graphic Design</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Why us</span>
            <h2>Why businesses choose Nadine Cloud</h2>
          </div>
          <div className="included-grid">
            <div>Modern &amp; Responsive Designs</div>
            <div>Fast, Secure &amp; Reliable Hosting</div>
            <div>Business Email Solutions</div>
            <div>Free SSL Certificates</div>
            <div>Cloud-Based Applications</div>
            <div>Ongoing Technical Support</div>
            <div>Custom Software Development</div>
            <div>Worldwide Support</div>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Your project could be next</span>
          <h2>Your vision. Our technology. Built to grow your business.</h2>
          <p>Tell us what you&apos;re working on and we&apos;ll put together a plan and a quote.</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Start a project</a>
            <a className="btn-ghost" href="https://wa.me/260964068483?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20talk%20about%20a%20project." target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
