import type { Metadata } from "next";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Create Account — Nadine Cloud",
  robots: { index: false },
  alternates: { canonical: "https://www.nadinecloud.com/signup" },
};

export default function Signup() {
  return (
    <>
      <Header hideTalkToSales />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Account</span>
          <h1>Create your account.</h1>
          <p>Keep track of your orders and receipts in one place.</p>
        </div>
      </section>

      <section className="section" id="signup">
        <div className="wrap">
          <div className="contact-grid">
            <div className="contact-card">
              <h3>Create account</h3>
              <form id="signupForm" className="contact-form">
                <label>Full name
                  <input type="text" name="name" required maxLength={120} />
                </label>
                <label>Email
                  <input type="email" name="email" required maxLength={200} />
                </label>
                <label>Password
                  <input type="password" name="password" required minLength={8} maxLength={200} />
                </label>
                <button type="submit" className="btn-primary">Create account</button>
                <p id="formStatus" className="form-status" role="status" aria-live="polite"></p>
              </form>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="contact-card">
                <h3>Already have an account?</h3>
                <p>Log in to see your orders and receipts.</p>
                <Link className="btn-ghost" href="/login">Log in</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <script src="/js/auth-forms.js" />
    </>
  );
}
