import type { Metadata } from "next";
import Script from "next/script";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Log In — Nadine Cloud",
  robots: { index: false },
  alternates: { canonical: "https://www.nadinecloud.com/login" },
};

export default function Login() {
  return (
    <>
      <Header hideTalkToSales />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Account</span>
          <h1>Log in to your account.</h1>
          <p>View your orders and receipts.</p>
        </div>
      </section>

      <section className="section" id="login">
        <div className="wrap">
          <div className="contact-grid">
            <div className="contact-card">
              <h3>Log in</h3>
              <form id="loginForm" className="contact-form">
                <label>Email
                  <input type="email" name="email" required maxLength={200} />
                </label>
                <label>Password
                  <input type="password" name="password" required maxLength={200} />
                </label>
                <button type="submit" className="btn-primary">Log in</button>
                <p id="formStatus" className="form-status" role="status" aria-live="polite"></p>
              </form>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="contact-card">
                <h3>New here?</h3>
                <p>Create an account to keep track of your orders and receipts in one place.</p>
                <a className="btn-ghost" href="/signup">Create an account</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <Script src="/js/auth-forms.js" strategy="afterInteractive" />
    </>
  );
}
