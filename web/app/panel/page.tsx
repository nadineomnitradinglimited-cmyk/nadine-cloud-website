import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Control panel — Nadine Cloud",
  robots: { index: false },
  alternates: { canonical: "https://www.nadinecloud.com/panel" },
};

// Full-screen hosting control panel. Everything is drawn by /js/panel-app.js from /api/panel/* (logged-in owners only).
export default function Panel() {
  return (
    <>
      <style>{`#ncPromoBar,.promo-bar{display:none!important}html,body{background:#0B1020}`}</style>
      <div id="ncApp">
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#8A94A8", font: "500 15px 'Instrument Sans',system-ui,sans-serif" }}>
          Loading your control panel…
        </div>
      </div>
      <Script src="/js/panel-app.js" strategy="afterInteractive" />
    </>
  );
}
