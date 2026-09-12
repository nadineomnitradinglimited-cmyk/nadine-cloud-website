import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Refund Policy — Nadine Cloud";
const DESCRIPTION = "Refund policy for Nadine Cloud hosting, domains and web design services.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/refund" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/refund",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

export default function Refund() {
  return (
    <>
      <Header />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Legal</span>
          <h1>Refund policy</h1>
        </div>
      </section>

      <section className="section legal-body">
        <div className="wrap">
          <h2>Hosting</h2>
          <p>New hosting plans include a 14-day money-back guarantee. Renewals are refundable within 48 hours of payment if the renewal period has not been used.</p>

          <h2>Domains</h2>
          <p>Domain registrations and renewals are non-refundable once submitted to the registry, as registries do not refund us.</p>

          <h2>Web design</h2>
          <p>Deposits cover work performed and are non-refundable once design work has started. Remaining balances are only due on delivery.</p>

          <p>Questions about a refund? <a href="/contact" style={{ color: "var(--copper)" }}>Contact us</a>.</p>
        </div>
      </section>

      <Footer />
    </>
  );
}
