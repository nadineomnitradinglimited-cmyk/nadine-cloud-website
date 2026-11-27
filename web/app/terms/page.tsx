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
          <p style={{ color: "var(--text-mute)", fontSize: 14 }}>Last updated: 27 November 2026</p>

          <p>Nadine Cloud is a service of Nadine Technologies (&quot;we&quot;, &quot;us&quot;). By ordering web design, hosting, domain, database or email services, you agree to these terms.</p>

          <h2>Services</h2>
          <p>Hosting is billed in advance, monthly or for a longer period (6 months, 1, 2 or 3 years). Domains are registered for one year and renew annually. Web design projects are quoted individually and require a deposit before work begins.</p>

          <h2>Your control panel</h2>
          <p>You manage your hosting through the Nadine Cloud control panel at nadinecloud.com. Some advanced or sensitive tasks are carried out by our team on request.</p>

          <h2>Payment</h2>
          <p>Invoices are payable by mobile money, card or bank transfer by the due date shown on your invoice. If payment is not received by the due date, access to the service and the control panel may be restricted, and the website may be suspended until payment is made. Accounts that remain unpaid for 30 days may be terminated.</p>

          <h2>Backups</h2>
          <p>We make regular backups of hosting accounts and restore them on request. Backups are a safety measure and not a guarantee, so we recommend you also keep your own copies of important work (for example, on GitHub).</p>

          <h2>Your data</h2>
          <p>Your website content and data belong to you. Copies of your data are provided by our team on request for accounts that are fully paid. After an account is terminated, its data may be permanently deleted.</p>

          <h2>Acceptable use</h2>
          <p>You may not use our services for unlawful content, spam, malware or activities that harm our infrastructure or other clients. We may suspend accounts that breach this policy.</p>

          <h2>Liability</h2>
          <p>We aim for high availability but do not guarantee uninterrupted service, and are not liable for indirect losses. Our total liability is limited to fees paid in the preceding 3 months.</p>

          <p>Questions about these terms? <a href="/contact" style={{ color: "var(--copper)" }}>Contact us</a>.</p>
        </div>
      </section>

      <Footer />
    </>
  );
}
