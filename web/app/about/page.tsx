import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "About Us — Nadine Technologies";
const DESCRIPTION =
  "Nadine Technologies is a technology company founded in Oman, operating in South Africa, Kenya and Zambia: AI chatbots, robotics, apps & software, and cloud. Nadine Cloud, Nadine Vault and Nadine Pay are our products.";

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

const Ic = ({ d }: { d: string }) => (
  <span className="tp-ic">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
  </span>
);

const PILLARS = [
  { t: "AI Chatbots", d: "Smart assistants that answer your customers 24/7 on websites and apps — trained on your business.", i: "M4 5h16v11H9l-5 4zM8 10h.01M12 10h.01M16 10h.01" },
  { t: "Robotics", tag: "COMING SOON", d: "We are starting to design and build our own robots.", i: "M5 8h14v11H5zM12 4v4M9 13h.01M15 13h.01M2 12v3M22 12v3" },
  { t: "Apps & Software", d: "Android apps on Google Play, business systems, dashboards and websites.", i: "M6 2h12v20H6zM11 18h2" },
  { t: "Operating Systems & Phones", tag: "NEW", d: "Our own custom operating systems and custom-built phones.", i: "M3 4h18v13H3zM8 21h8M12 17v4M7 9l2 2-2 2M12 13h4" },
  { t: "Security & Defence", d: "Security devices, and military technology for authorised government and security agencies.", i: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM9 12l2 2 4-4" },
  { t: "Cloud & Payments", d: "Hosting, domains, business email, secure storage and mobile money payments.", i: "M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z" },
];

const VALUES = [
  { t: "Innovation", d: "We keep learning and building new things — AI, robotics and smarter software — so our clients stay ahead." },
  { t: "Security & Privacy", d: "Client data is protected with encryption, strong logins and regular, encrypted off-site backups." },
  { t: "Reliability", d: "We monitor the systems we run around the clock and fix problems before customers notice them." },
  { t: "Transparency", d: "Clear prices in Kwacha, honest advice and plain-language explanations — no hidden charges." },
  { t: "Local First", d: "Built for the markets we serve: local payments like mobile money, local support and fair, affordable pricing." },
];

const SERVICES = [
  { t: "Custom Operating Systems", tag: "NEW", d: "Our own operating systems, built and secured for phones, devices and businesses." },
  { t: "Custom-Built Phones", tag: "NEW", d: "Phones built to order, running our own secure software." },
  { t: "Security Devices", d: "CCTV, alarms, access control and trackers that connect to your phone." },
  { t: "Defence & Military Technology", d: "Military equipment and technology for authorised government and security agencies." },
  { t: "AI Chatbots", d: "Custom chatbots trained on your business: answer questions, take orders and bookings, and hand over to staff." },
  { t: "Robotics", tag: "NEW", d: "Our own robots, now in development — starting with practical robots for businesses and learning." },
  { t: "Mobile Apps", d: "Android apps published on Google Play, with updates delivered straight to the phone." },
  { t: "Business Systems", d: "Stock, sales, patient records, logistics and staff systems with admin dashboards." },
  { t: "Websites & Domains", d: "Professional websites, .com and .zm domains, SSL certificates and DNS." },
  { t: "Cloud Hosting & Email", d: "Fast hosting, databases and business email through Nadine Cloud." },
  { t: "Nadine Vault", d: "Secure cloud storage app for photos and files — 2 GB free.", href: "/vault" },
  { t: "Nadine Pay", d: "Mobile money payments (Airtel, MTN, Zamtel) and payment links for invoices." },
];

const WORK = [
  { t: "Pharmacy app", d: "An installable app for stock, sales and reports for a pharmacy." },
  { t: "Clinic records system", d: "Patient records, payments and staff PINs for an optical clinic, with nightly encrypted backups." },
  { t: "Logistics admin system", d: "Shipments, clients and accounting for a shipping company, with an in-app mailbox." },
  { t: "Shop & booking apps", d: "Customer apps, websites and hosting for retail and tourism businesses." },
];

const WHY = [
  { t: "Everything in one place", d: "AI, apps, websites, hosting, email and payments — one team, one bill." },
  { t: "Secure by design", d: "Encryption, Cloudflare protection and encrypted off-site backups." },
  { t: "Always improving", d: "Our apps update themselves — no reinstalling. New features arrive automatically." },
  { t: "Local payments", d: "Pay in Kwacha with Airtel, MTN or Zamtel mobile money through Nadine Pay." },
  { t: "24/7 monitoring", d: "Our own monitoring watches your systems day and night." },
  { t: "Real support", d: "Email support@nadinecloud.com and a real person replies." },
];

export default function About() {
  return (
    <>
      <Header />

      <section className="page-hero tp-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">About Nadine Technologies</span>
          <h1>A pure technology company, founded in Oman.</h1>
          <p>
            Founded in Oman, with operations in South Africa, Kenya and Zambia, Nadine Technologies designs, builds
            and runs the technology businesses depend on — from artificial intelligence, software and operating
            systems to custom-built phones, security devices and the cloud servers they run on. We are no longer
            just hosting: we build complete technology solutions, and we are now stepping into robotics. Nadine
            Cloud, Nadine Vault and Nadine Pay are our products.
          </p>
        </div>
      </section>

      <section className="section nt-future" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="tp-grid tp-3">
            {PILLARS.map((p) => (
              <div className="tp-card" key={p.t}>
                <Ic d={p.i} />
                <h3>{p.t} {p.tag && <span className="tp-tag">{p.tag}</span>}</h3>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Our vision</span>
            <h2>A leading global technology company</h2>
            <p>Designing and building artificial intelligence, robotics, devices and software for the markets we serve.</p>
          </div>
          <div className="tp-grid tp-4">
            {SERVICES.map((s) => (
              <div className="tp-card" key={s.t}>
                <h3>{s.href ? <a href={s.href}>{s.t}</a> : s.t} {s.tag && <span className="tp-tag">{s.tag}</span>}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="contact-grid">
            <div>
              <span className="eyebrow">Our mission</span>
              <h2>World-class technology, affordable for every business.</h2>
              <p style={{ color: "var(--text-soft)", marginBottom: 14 }}>
                We build smart, secure and reliable AI, software and cloud solutions — and grow local talent in
                software engineering and robotics.
              </p>
              <ul className="tp-list">
                <li>Bring AI to everyday business — not just big companies.</li>
                <li>Design and build our own robots, phones and hardware.</li>
                <li>Keep every client&apos;s data safe, private and backed up.</li>
                <li>Price our services fairly, in Kwacha, with mobile money.</li>
              </ul>
            </div>
            <div>
              <span className="eyebrow">Our values</span>
              <div className="tp-values">
                {VALUES.map((v) => (
                  <div key={v.t}><b>{v.t}</b><span>{v.d}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Our clientele</span>
            <h2>Who we work with</h2>
            <p>SMEs · pharmacies, clinics and optical practices · logistics and courier companies · tourism lodges and safari operators · retail shops and online sellers · churches, schools and non-profits · and the public, through Nadine Vault.</p>
          </div>
          <div className="tp-grid tp-4">
            {WORK.map((w) => (
              <div className="tp-card" key={w.t}><h3>{w.t}</h3><p>{w.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Why choose us</span>
            <h2>One partner for all your technology</h2>
          </div>
          <div className="tp-grid tp-3">
            {WHY.map((w) => (
              <div className="tp-card" key={w.t}><h3>{w.t}</h3><p>{w.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="team" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="contact-grid">
            <div>
              <img
                src="/assets/team-support.jpeg"
                alt="A member of the Nadine Technologies team standing in front of the company's servers"
                style={{ borderRadius: 16, width: "100%", display: "block", boxShadow: "0 1px 2px rgba(11,18,32,.05), 0 12px 30px rgba(11,18,32,.08)" }}
              />
            </div>
            <div>
              <span className="eyebrow">Our team</span>
              <h2>Real people who build and run it.</h2>
              <p style={{ color: "var(--text-soft)", marginBottom: 14 }}>
                Our team is made up of software developers, designers and support staff with experience in AI, mobile
                apps, business systems, cloud servers and cyber security. We work closely with every client to build
                technology that actually fits their business.
              </p>
              <p style={{ color: "var(--text-soft)", marginBottom: 22 }}>
                We are now growing a robotics and AI research team — combining software, electronics and engineering —
                to design and build our own robots.
              </p>
              <a className="btn-wa" href="mailto:info@nadinecloud.com?subject=Hello%20Nadine%20Technologies" target="_blank" rel="noopener">
                Email us
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Let&apos;s build your next idea</span>
          <h2>Need a chatbot, an app or a system?</h2>
          <p>General: info@nadinecloud.com · Support: support@nadinecloud.com · Billing: billing@nadinecloud.com · Founded in Oman · Operating in South Africa, Kenya &amp; Zambia · Mon–Fri 08:00–17:00, Sat 09:00–13:00</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Contact us</a>
            <a className="btn-ghost" href="/assets/nadine-technologies-profile.pdf" target="_blank" rel="noopener">
              Download company profile (PDF)
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
