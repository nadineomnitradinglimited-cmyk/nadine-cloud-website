import Link from "next/link";
import Header from "./components/Header";

export default function NotFound() {
  return (
    <>
      <Header />

      <section className="page-hero" style={{ textAlign: "center" }}>
        <div className="wrap page-hero-inner" style={{ maxWidth: 600, margin: "0 auto" }}>
          <span className="eyebrow">404</span>
          <h1>This page went offline.</h1>
          <p>The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you back on track.</p>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <div className="actions">
            <Link className="btn-primary" href="/">Back to home</Link>
            <Link className="btn-ghost" href="/contact">Contact us</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot-bottom">
            <span>© 2026 Nadine Omni Trading Limited. All rights reserved.</span>
            <span>Serving clients worldwide</span>
          </div>
        </div>
      </footer>
    </>
  );
}
