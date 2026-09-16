import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Marketing Tools — Nadine Cloud";
const DESCRIPTION =
  "SEO, social media management, email marketing and paid ads — get more customers to the website we build and host for you.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/marketing" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/marketing",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

export default function Marketing() {
  return (
    <>
      <Header />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Marketing</span>
          <h1>A website is only useful if people find it.</h1>
          <p>Once we&apos;ve built and hosted your site, we can help bring customers to it — SEO, social media, email campaigns and paid ads, run by the same team.</p>
        </div>
      </section>

      <section className="section" id="marketing">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">What we offer</span>
            <h2>Marketing services</h2>
            <p>Priced per project, based on your goals and how much ongoing management you need — message us for a quote.</p>
          </div>
          <div className="services-grid">
            <div className="svc" id="seo">
              <div className="ic"><svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FBA30E" strokeWidth={2}><circle cx={11} cy={11} r={7} /><path d="m21 21-4.3-4.3" /></svg></div>
              <h3>SEO setup &amp; optimization</h3>
              <p>On-page SEO, meta tags, sitemaps and search console setup so your site actually shows up in search results.</p>
            </div>
            <div className="svc" id="social">
              <div className="ic"><svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FBA30E" strokeWidth={2}><rect x={3} y={3} width={18} height={18} rx={3} /><path d="M8 12h.01M12 12h.01M16 12h.01" /></svg></div>
              <h3>Social media management</h3>
              <p>We plan and post content on Facebook, Instagram and other platforms to keep your business active and visible.</p>
            </div>
            <div className="svc" id="email-marketing">
              <div className="ic"><svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FBA30E" strokeWidth={2}><rect x={3} y={5} width={18} height={14} rx={2} /><path d="m3 7 9 6 9-6" /></svg></div>
              <h3>Email marketing campaigns</h3>
              <p>Newsletters and promotional emails to your customer list, using the business email we already host for you.</p>
            </div>
            <div className="svc" id="ads">
              <div className="ic"><svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FBA30E" strokeWidth={2}><path d="M3 12h18M12 3v18" /><path d="m17 8 4 4-4 4M7 8l-4 4 4 4" /></svg></div>
              <h3>Paid ads management</h3>
              <p>Google and Facebook ad campaigns set up, targeted and managed to bring in the customers you&apos;re after.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Get more customers</span>
          <h2>Tell us what you&apos;re trying to grow</h2>
          <p>We&apos;ll recommend which of these makes sense for your business and give you a fixed quote.</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Request a quote</a>
            <a className="btn-ghost" href="https://wa.me/260964068483?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20ask%20about%20marketing%20services." target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
