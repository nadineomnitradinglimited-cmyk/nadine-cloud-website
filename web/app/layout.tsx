import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nadine Cloud — Web Design, Hosting & Domains Worldwide",
  description:
    "Nadine Cloud builds, hosts and manages websites for businesses worldwide. Web design, cPanel hosting, domains and business email — all under one roof.",
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
        <script src="/js/main.js" />
        <script src="/js/currency.js" defer />
        <script src="/js/billing-toggle.js" defer />
        <script src="/js/chat-widget.js" />
      </body>
    </html>
  );
}
