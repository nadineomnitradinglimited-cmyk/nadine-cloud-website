import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import InlineDomainSearch from "../components/InlineDomainSearch";

const TITLE = "Domain Registration — Nadine Cloud";
const DESCRIPTION =
  "Register or transfer .com, .org, .net and more, starting from about $16 a year. We handle the DNS so your domain, email and website just work.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/domains" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/domains",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

export default function Domains() {
  return (
    <>
      <Header />

      <section className="page-hero has-photo">
        <img src="/assets/hero-domains.jpg" alt="" className="page-hero-photo" aria-hidden="true" />
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Domains</span>
          <h1>Your name, your address on the internet.</h1>
          <p>Register or transfer .com, .org, .net and more, starting from <span className="amt-live" data-zmw="315">ZMW 315</span>/year. We handle the DNS so your domain, email and website just work.</p>
        </div>
      </section>

      <section className="section" id="domains">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Check availability</span>
            <h2>Find your domain name</h2>
            <p>Search a name below and register it online — we&apos;ll set up the DNS, email and hosting with you.</p>
          </div>
          <InlineDomainSearch />
        </div>
      </section>

      <section className="section" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Domain pricing</span>
            <h2>Pick your extension</h2>
            <p>Prices shown in your local currency where available. The exact price for your name is shown when you search.</p>
          </div>
          <div className="tld-cards">
            <div className="tld-card">
              <span className="badge">Popular</span>
              <span className="ext">.com</span>
              <span className="tagline">The classic choice — instantly recognized, trusted by customers everywhere.</span>
              <div className="price"><span className="from">From</span> <span className="amt amt-live" data-zmw="330">ZMW 330</span> <span className="per">/yr</span><small className="price-note" hidden></small></div>
              <a className="cta" href="#domains">Search a name</a>
            </div>
            <div className="tld-card">
              <span className="ext">.org</span>
              <span className="tagline">The domain for causes, communities and non-profits.</span>
              <div className="price"><span className="from">From</span> <span className="amt amt-live" data-zmw="315">ZMW 315</span> <span className="per">/yr</span><small className="price-note" hidden></small></div>
              <a className="cta" href="#domains">Search a name</a>
            </div>
            <div className="tld-card">
              <span className="ext">.net</span>
              <span className="tagline">A trusted alternative when the .com you want is taken.</span>
              <div className="price"><span className="from">From</span> <span className="amt amt-live" data-zmw="315">ZMW 315</span> <span className="per">/yr</span><small className="price-note" hidden></small></div>
              <a className="cta" href="#domains">Search a name</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Everything in one place</span>
            <h2>Buy a domain and everything else you need</h2>
            <p>Your domain, hosting and business email — set up together, from the same team.</p>
          </div>
          <div className="cross-sell">
            <a href="/hosting"><b>Hosting</b><span>NVMe cPanel hosting from <span className="amt-live" data-zmw="600">ZMW 600</span>/yr</span></a>
            <a href="/hosting"><b>Business email</b><span>Professional email at your domain, from <span className="amt-live" data-zmw="300">ZMW 300</span>/yr</span></a>
            <a href="/services"><b>Web design</b><span>A website built and launched on your new domain</span></a>
            <a href="/contact"><b>Talk to us</b><span>Not sure what you need? We&apos;ll help you figure it out</span></a>
          </div>
        </div>
      </section>

      <section className="section" id="transfer">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Transfers</span>
            <h2>Already own a domain elsewhere?</h2>
            <p>We can transfer it in without downtime, then connect it straight to your Nadine Cloud hosting and email.</p>
          </div>
          <div className="process">
            <div className="step">
              <div className="num">01</div>
              <h3>Unlock &amp; get your code</h3>
              <p>We&apos;ll tell you exactly what to request from your current registrar — usually an auth/EPP code.</p>
            </div>
            <div className="step">
              <div className="num">02</div>
              <h3>We start the transfer</h3>
              <p>Send us the code and we handle the rest. Your site keeps working throughout — no downtime.</p>
            </div>
            <div className="step">
              <div className="num">03</div>
              <h3>Connect &amp; go</h3>
              <p>Once transferred, we point it at your hosting and set up your business email the same day.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Get your name</span>
          <h2>Register or transfer your domain today</h2>
          <p>Message us the name you want and we&apos;ll confirm availability and pricing.</p>
          <div className="actions">
            <a className="btn-primary" href="/contact">Request a domain</a>
            <a className="btn-ghost" href="https://wa.me/260964068483?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20register%20a%20domain." target="_blank" rel="noopener">Chat on WhatsApp</a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
