import type { Metadata } from "next";
import Script from "next/script";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "My Account — Nadine Cloud",
  robots: { index: false },
  alternates: { canonical: "https://www.nadinecloud.com/account" },
};

// The dashboard itself is drawn by /js/account.js from /api/auth/me.
export default function Account() {
  return (
    <>
      <Header hideTalkToSales />

      <section className="ac-page" id="account">
        <div className="ac-wrap">
          <div id="acctLoading" className="ac-loading">
            <span className="ac-spinner" aria-hidden="true" /> Loading your account…
          </div>

          {/* Logged out */}
          <div id="loggedOutView" hidden>
            <div className="ac-out">
              <div className="ac-out-hero">
                <span className="eyebrow">My Nadine Cloud</span>
                <h1>Everything you have with us, in one place</h1>
                <p>See your websites, hosting, databases and domains, know exactly when each one renews, pay in one tap and download every receipt.</p>
              </div>
              <div className="ac-out-cards">
                <a className="ac-out-card" href="/login">
                  <span className="ac-out-ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></svg>
                  </span>
                  <b>Log in</b>
                  <span>Already a customer? Open your dashboard.</span>
                </a>
                <a className="ac-out-card alt" href="/signup">
                  <span className="ac-out-ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="4" /><path d="M2 21c.7-3.6 3.6-6 7-6s6.3 2.4 7 6" /><path d="M19 8v6M16 11h6" /></svg>
                  </span>
                  <b>Create an account</b>
                  <span>Free. Keep all your orders and receipts together.</span>
                </a>
              </div>
            </div>
          </div>

          {/* Logged in: sidebar + content */}
          <div id="loggedInView" className="ac-shell" hidden>
            <aside className="ac-side" aria-label="Account menu">
              <nav className="ac-nav" id="acNav">
                <button type="button" data-tab="dashboard" className="on">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
                  Dashboard
                </button>
                <button type="button" data-tab="attention">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M5 3 2 6M22 6l-3-3" /></svg>
                  Due &amp; renewals <span className="ac-badge" id="acDueBadge" hidden>0</span>
                </button>
                <button type="button" data-tab="domains">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18-2.6-3-2.6-15 0-18Z" /></svg>
                  Domains &amp; DNS
                </button>
                <button type="button" data-tab="hosting">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></svg>
                  Hosting &amp; websites
                </button>
                <button type="button" data-tab="databases">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>
                  Databases
                </button>
                <button type="button" data-tab="email">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                  Business email
                </button>
                <button type="button" data-tab="ssl">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                  SSL certificates
                </button>
                <button type="button" data-tab="billing">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 7h6M9 11h6M9 15h4" /></svg>
                  Billing &amp; receipts
                </button>
                <button type="button" data-tab="profile">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5" /></svg>
                  Profile
                </button>
                <button type="button" data-tab="help">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01" /></svg>
                  Help &amp; support
                </button>
              </nav>
              <button type="button" id="logoutBtn" className="ac-logout">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>
                Log out
              </button>
            </aside>

            <div className="ac-main" id="acMain" aria-live="polite"></div>
          </div>

          <div id="acctError" className="ac-error" hidden></div>
        </div>
      </section>

      <Footer />
      <Script src="/js/account.js" strategy="afterInteractive" />
    </>
  );
}
