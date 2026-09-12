import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Privacy Policy — Nadine Cloud";
const DESCRIPTION = "How Nadine Cloud collects, uses and protects your personal data.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/privacy" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/privacy",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

export default function Privacy() {
  return (
    <>
      <Header />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Legal</span>
          <h1>Privacy policy</h1>
        </div>
      </section>

      <section className="section legal-body">
        <div className="wrap">
          <p>We collect only the information needed to provide our services: your name, contact details, billing information and technical data required to operate your hosting and domains.</p>
          <p>We do not sell your personal data. Payment card details are processed by our payment provider and are not stored on our servers. Domain registration details are submitted to the relevant registry as required by ICANN and ZICTA rules.</p>
          <p>You may request a copy or deletion of your personal data at any time by contacting <a href="mailto:info@nadinecloud.com" style={{ color: "var(--copper)" }}>info@nadinecloud.com</a>.</p>
        </div>
      </section>

      <Footer />
    </>
  );
}
