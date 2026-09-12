import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Terms of Service — Nadine Cloud";
const DESCRIPTION = "Terms of service for Nadine Cloud web design, hosting, domain and email services.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/terms" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/terms",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

export default function Terms() {
  return (
    <>
      <Header />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Legal</span>
          <h1>Terms of service</h1>
        </div>
      </section>

      <section className="section legal-body">
        <div className="wrap">
          <p>Nadine Cloud is a service of Nadine Omni Trading Limited (&quot;we&quot;, &quot;us&quot;). By ordering web design, hosting, domain or email services, you agree to these terms.</p>

          <h2>Services</h2>
          <p>Hosting is billed monthly or annually in advance. Domains are registered for one year and renew annually. Web design projects are quoted individually and require a deposit before work begins.</p>

          <h2>Acceptable use</h2>
          <p>You may not use our services for unlawful content, spam, malware or activities that harm our infrastructure or other clients. We may suspend accounts that breach this policy.</p>

          <h2>Payment</h2>
          <p>Invoices are payable by mobile money, card or bank transfer. Services may be suspended for accounts more than 7 days overdue and terminated after 30 days.</p>

          <h2>Liability</h2>
          <p>We provide services on a 99.9% uptime target but are not liable for indirect losses. Our total liability is limited to fees paid in the preceding 3 months.</p>

          <p>Questions about these terms? <a href="/contact" style={{ color: "var(--copper)" }}>Contact us</a>.</p>
        </div>
      </section>

      <Footer />
    </>
  );
}
