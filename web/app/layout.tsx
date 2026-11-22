import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nadine Cloud — Websites, Hosting & AI for Your Business",
  description:
    "Get your business online for less: a professional website, fast hosting, your own domain and business email — plus AI chatbots, business systems and automation by Nadine Technologies. Pay by mobile money or card.",
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: "Nadine Cloud — Websites, Hosting & AI for Your Business",
    description:
      "Get your business online for less: a professional website, fast hosting, your own domain and business email — plus AI chatbots, business systems and automation by Nadine Technologies.",
    url: "https://www.nadinecloud.com/",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        {/* afterInteractive: these vanilla scripts mutate the DOM (inject
            the chat widget, wire up nav/forms). Running them during the
            browser's initial HTML parse -- before React finishes
            hydrating -- caused a hydration mismatch (React error #418)
            that made React discard and rebuild the affected DOM, wiping
            out the chat widget and orphaning main.js's element
            references (the stat counters never animated as a result).
            afterInteractive defers execution until just after hydration
            completes, so these scripts only ever touch a DOM React
            already considers settled. */}
        <Script src="/js/main.js" strategy="afterInteractive" />
        <Script src="/js/currency.js" strategy="afterInteractive" />
        <Script src="/js/billing-toggle.js" strategy="afterInteractive" />
        <Script src="/js/promo-banner.js" strategy="afterInteractive" />
        <Script src="/js/chat-widget.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
