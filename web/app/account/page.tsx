import type { Metadata } from "next";
import Script from "next/script";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "My Account — Nadine Cloud",
  robots: { index: false },
  alternates: { canonical: "https://www.nadinecloud.com/account" },
};

export default function Account() {
  return (
    <>
      <Header hideTalkToSales />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Account</span>
          <h1 id="acctTitle">My account</h1>
          <p id="acctSub">Loading…</p>
        </div>
      </section>

      <section className="section" id="account">
        <div className="wrap">
          <div id="loggedOutView" hidden>
            <div className="contact-grid">
              <div className="contact-card">
                <h3>Log in</h3>
                <p>Log in to see your orders and receipts.</p>
                <a className="btn-primary" href="/login">Log in</a>
              </div>
              <div className="contact-card">
                <h3>New here?</h3>
                <p>Create an account to keep track of your orders in one place.</p>
                <a className="btn-ghost" href="/signup">Create an account</a>
              </div>
            </div>
          </div>

          <div id="loggedInView" hidden>
            <div className="contact-card" style={{ marginBottom: 24 }}>
              <h3 id="acctName">—</h3>
              <p id="acctEmail" style={{ color: "var(--text-mute)" }}></p>
              <button type="button" id="logoutBtn" className="btn-ghost" style={{ marginTop: 10 }}>Log out</button>
            </div>
            <div className="contact-card">
              <h3>Your orders</h3>
              <div id="ordersEmpty" hidden><p>No orders yet.</p></div>
              <div id="ordersList"></div>
            </div>
          </div>

          <div id="acctError" className="contact-card" hidden></div>
        </div>
      </section>

      <Footer />
      <Script src="/js/account.js" strategy="afterInteractive" />
    </>
  );
}
