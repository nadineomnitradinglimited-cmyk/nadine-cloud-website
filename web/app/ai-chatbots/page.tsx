import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ChatArt } from "../components/SolutionArt";

const TITLE = "AI Chatbots for your website | Nadine Cloud";
const DESCRIPTION =
  "A smart AI assistant for your website that answers customers 24/7, takes enquiries and bookings, and hands over to your staff by email. Built and run by Nadine Technologies.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/ai-chatbots" },
  openGraph: { type: "website", siteName: "Nadine Cloud", title: TITLE, description: DESCRIPTION, url: "https://www.nadinecloud.com/ai-chatbots" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const ask = (plan: string) =>
  `mailto:info@nadinecloud.com?subject=${encodeURIComponent(`AI Chatbot — ${plan}`)}&body=${encodeURIComponent(
    `Hi Nadine Cloud, I'd like an AI chatbot for my business (${plan} plan).\n\nBusiness name:\nWebsite:\nWhat should the chatbot help customers with?\n`
  )}`;

const BOT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x={5} y={8} width={14} height={11} rx={3} />
    <path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5" />
  </svg>
);

const PLANS = [
  {
    name: "Starter", price: 300, setup: 1500, for: "Answer common questions on your website",
    perks: ["Chat bubble on your website", "Trained on your business, prices and FAQs", "Answers 24/7", "Up to 1,000 conversations a month", "Monthly update of its knowledge"],
  },
  {
    name: "Business", price: 600, setup: 1500, featured: true, for: "Turn chats into enquiries and bookings",
    perks: ["Everything in Starter", "Collects enquiries, orders and booking requests", "Hands over to your staff by email", "Up to 3,000 conversations a month", "Monthly report: what customers ask most"],
  },
  {
    name: "Pro", price: 1200, setup: 2500, for: "For busy businesses and several branches",
    perks: ["Everything in Business", "Connected to your own system (stock, bookings…)", "Several branches or departments", "Up to 10,000 conversations a month", "Priority support"],
  },
];

export default function AiChatbots() {
  return (
    <>
      <Header getStartedHref="/ai-chatbots#plans" />

      <section className="page-hero tp-hero sol-hero">
        <div className="wrap sol-hero-grid">
        <div className="page-hero-inner sol-hero-text">
          <span className="eyebrow">New · AI Chatbots by Nadine Technologies</span>
          <h1>An AI assistant that answers your customers, day and night.</h1>
          <p>
            We build a chatbot trained on <b>your</b> business — your products, prices, opening hours and policies — and put it on your
            website. It answers questions instantly, collects enquiries and bookings, and passes anything important to your staff by email.
          </p>
          <div className="actions" style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="btn-primary" href="#plans">See plans</a>
            <a className="btn-ghost" href={ask("not sure yet")} target="_blank" rel="noopener">Ask us a question</a>
          </div>
        </div>
        <ChatArt />
        </div>
      </section>

      <section className="section sol-dots" id="how">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>Live on your website in about a week</h2>
          </div>
          <div className="services-grid">
            <div className="svc">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#1769FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H8l-4 4z" /></svg></div>
              <h3>1. Tell us about your business</h3>
              <p>Send us your prices, services, FAQs and the questions customers ask most. We do the rest.</p>
            </div>
            <div className="svc">
              <div className="ic">{BOT_ICON}</div>
              <h3>2. We train and test it</h3>
              <p>We teach the assistant your business and test it with real questions until it answers the way you would.</p>
            </div>
            <div className="svc">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#1769FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></div>
              <h3>3. It goes live</h3>
              <p>A chat bubble appears on your website. Customers get answers in seconds, and you get their enquiries by email.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section pricing" id="plans" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Plans</span>
            <h2>Simple monthly plans</h2>
            <p>Prices are per month, plus a one-time setup fee. No contract — cancel any time. Pay by mobile money or bank.</p>
          </div>
          <div className="plans">
            {PLANS.map((p) => (
              <div className={p.featured ? "plan featured" : "plan"} key={p.name}>
                <div className="plan-icon">{BOT_ICON}</div>
                <h3>{p.name}</h3>
                <div className="for">{p.for}</div>
                <div className="price">
                  <span className="amt amt-live" data-zmw={p.price}>ZMW {p.price.toLocaleString("en-ZM")}</span> <span className="per">/month</span>
                  <small className="price-note" hidden></small>
                  <div className="for" style={{ marginTop: 6, fontWeight: 600 }}>+ ZMW {p.setup.toLocaleString("en-ZM")} one-time setup</div>
                </div>
                <ul>
                  {p.perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
                <a className="cta" href={ask(p.name)} target="_blank" rel="noopener">Get started</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section sol-dots" id="faq">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>AI Chatbot FAQ</h2>
          </div>
          <div className="faq">
            <details className="faq-item" open>
              <summary>Do I need a website?</summary>
              <p>Yes — the chatbot lives on your website. No website yet? We can build one for you and add the chatbot at the same time.</p>
            </details>
            <details className="faq-item">
              <summary>What if the chatbot doesn&apos;t know an answer?</summary>
              <p>It tells the customer politely and takes their details, then sends the question to your staff by email so a real person can reply.</p>
            </details>
            <details className="faq-item">
              <summary>Can I change what it knows?</summary>
              <p>Yes. Email us new prices, products or policies any time and we update it. On every plan we refresh its knowledge each month.</p>
            </details>
            <details className="faq-item">
              <summary>Is my customers&apos; information safe?</summary>
              <p>Conversations are stored securely and only used to help your customers and improve your chatbot. We never sell or share them.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">Ready when you are</span>
          <h2>Give your customers instant answers</h2>
          <p>Email us and we&apos;ll show you a free demo trained on your business.</p>
          <div className="actions">
            <a className="btn-primary" href={ask("free demo")} target="_blank" rel="noopener">Ask for a free demo</a>
            <a className="btn-ghost" href="/contact">Contact us</a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
