import type { Metadata } from "next";
import Script from "next/script";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

const TITLE = "AI Website Generator — Nadine Cloud";
const DESCRIPTION = "Describe your business and get a real, live website in seconds — free with Website Builder or Launch hosting.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/builder/generate" },
};

export default function AiBuilderGenerate() {
  return (
    <>
      <Header hideGetStarted />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">AI Website Generator</span>
          <h1>Describe your business. Get a live website.</h1>
          <p>Free with Website Builder or Launch hosting — up to 5 previews per site, no payment needed to try it.</p>
        </div>
      </section>

      <section className="section" id="ai-builder">
        <div className="wrap">
          <div className="contact-grid">
            <div className="contact-card">
              <h3 id="aiFormTitle">Tell us about your business</h3>
              <form id="aiGenerateForm" className="contact-form">
                <label>What does your business do?
                  <textarea
                    id="aiPrompt"
                    name="prompt"
                    required
                    maxLength={800}
                    rows={5}
                    placeholder="e.g. I run a hair salon in Lusaka called Glow Studio — braids, weaves and treatments, open Tue-Sat."
                  />
                </label>
                <button type="submit" className="btn-primary" id="aiGenerateBtn">Generate my site</button>
                <p id="aiStatus" className="form-status" role="status" aria-live="polite"></p>
              </form>
            </div>
            <div id="aiPreviewWrap" hidden>
              <div className="contact-card" style={{ marginBottom: 16 }}>
                <iframe
                  id="aiPreviewFrame"
                  title="Your generated website preview"
                  sandbox="allow-scripts"
                  style={{ width: "100%", height: 420, border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}
                />
              </div>
              <div className="contact-card">
                <h3>Want changes?</h3>
                <form id="aiRefineForm" className="contact-form">
                  <label>What should we change?
                    <input type="text" id="aiRefinePrompt" name="refinePrompt" maxLength={800} placeholder="e.g. Make the header blue and add a contact form" />
                  </label>
                  <button type="submit" className="btn-ghost" id="aiRefineBtn">Update preview</button>
                </form>
                <p id="aiGenerationsLeft" style={{ fontSize: 13.5, color: "var(--text-mute)", marginTop: 10 }}></p>
              </div>
              <div className="contact-card" style={{ marginTop: 16 }}>
                <h3>Happy with it? Make it live.</h3>
                <p style={{ color: "var(--text-soft)", marginBottom: 14 }}>Pay for hosting and we deploy this exact site to your new domain the same day.</p>
                <div className="actions" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <a className="btn-primary" id="aiGetBuilder" href="#">Get Builder — <span className="amt-live" data-zmw="59">ZMW 59</span>/mo</a>
                  <a className="btn-ghost" id="aiGetLaunch" href="#">Get Launch — <span className="amt-live" data-zmw="850">ZMW 850</span></a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <Script src="/js/ai-builder.js" strategy="afterInteractive" />
    </>
  );
}
