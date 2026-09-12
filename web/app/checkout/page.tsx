import type { Metadata } from "next";
import Script from "next/script";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Checkout — Nadine Cloud",
  description: "Pay for your Nadine Cloud hosting, domain or email plan by mobile money.",
  robots: { index: false },
  alternates: { canonical: "https://www.nadinecloud.com/checkout" },
};

export default function Checkout() {
  return (
    <>
      <Header hideGetStarted />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Checkout</span>
          <h1 id="ckPlanTitle">Complete your order</h1>
          <p id="ckPlanSub">Pay by mobile money — MTN, Airtel or Zamtel.</p>
        </div>
      </section>

      <section className="section" id="checkout">
        <div className="wrap">
          <div className="contact-grid">
            <div className="contact-card">
              <h3>Pay with mobile money</h3>
              <form id="checkoutForm" className="contact-form">
                <label>Full name
                  <input type="text" name="name" required maxLength={120} />
                </label>
                <label>Email
                  <input type="email" name="email" required maxLength={200} />
                </label>
                <div id="domainChoice" hidden className="radio-group">
                  <span className="radio-group-label">Domain for this hosting account</span>
                  <label className="radio-inline"><input type="radio" name="domainOption" value="existing" defaultChecked /> I already own this domain</label>
                  <label className="radio-inline"><input type="radio" name="domainOption" value="new" /> I need to register a new domain</label>
                </div>
                <label id="domainField" hidden>Domain you want to register
                  <input type="text" name="domain" placeholder="yourbusiness.com" maxLength={255} autoComplete="off" />
                </label>
                <label id="domainConfirmField" hidden>Confirm domain (type it again)
                  <input type="text" name="domainConfirm" placeholder="yourbusiness.com" maxLength={255} autoComplete="off" />
                </label>
                <p id="domainMismatch" className="form-status err" hidden style={{ margin: "-8px 0 0" }}>Those two don&apos;t match — please check for typos.</p>
                <p id="domainNewNote" className="form-status" hidden style={{ margin: "-8px 0 0", color: "var(--text-mute)" }}>This payment covers hosting only. We&apos;ll check availability and message you to confirm the exact domain price before registering it.</p>

                <div id="registrantFields" hidden>
                  <p className="form-status" style={{ margin: "0 0 10px", color: "var(--text-mute)" }}>Domain registration requires a real contact address on file (ICANN requirement) — this is who will legally own the domain.</p>
                  <label>Street address
                    <input type="text" name="address1" maxLength={200} autoComplete="address-line1" />
                  </label>
                  <label>City
                    <input type="text" name="city" maxLength={100} autoComplete="address-level2" />
                  </label>
                  <label>State / Province
                    <input type="text" name="stateProvince" maxLength={100} autoComplete="address-level1" />
                  </label>
                  <label>Postal code
                    <input type="text" name="postalCode" maxLength={20} autoComplete="postal-code" />
                  </label>
                  <label>Country
                    <select name="country" autoComplete="country" defaultValue="ZM">
                      <option value="ZM">Zambia</option>
                      <option value="ZA">South Africa</option>
                      <option value="ZW">Zimbabwe</option>
                      <option value="KE">Kenya</option>
                      <option value="NG">Nigeria</option>
                      <option value="GH">Ghana</option>
                      <option value="TZ">Tanzania</option>
                      <option value="MW">Malawi</option>
                      <option value="BW">Botswana</option>
                      <option value="GB">United Kingdom</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="OTHER">Other (message us)</option>
                    </select>
                  </label>
                </div>
                <label>Mobile money network
                  <select name="operator" required defaultValue="">
                    <option value="">Select network</option>
                    <option value="mtn">MTN Mobile Money</option>
                    <option value="airtel">Airtel Money</option>
                    <option value="zamtel">Zamtel Kwacha</option>
                  </select>
                </label>
                <label>Mobile money phone number
                  <input type="tel" name="phone" required placeholder="09XXXXXXXX" maxLength={20} />
                </label>
                <button type="submit" className="btn-primary" id="ckSubmit">Pay <span id="ckAmountLabel">now</span></button>
                <p id="ckStatus" className="form-status" role="status" aria-live="polite"></p>
              </form>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="contact-card">
                <h3>Order summary</h3>
                <p><strong id="ckSummaryPlan">—</strong></p>
                <p id="ckSummaryAmount" style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--cloud)" }}>—</p>
                <p style={{ fontSize: 13.5, color: "var(--text-mute)" }} id="ckBillingNote">Card payments aren&apos;t available yet — mobile money only for now.</p>
              </div>
              <div className="contact-card">
                <h3>How it works</h3>
                <p><strong>1.</strong> Enter your details and submit.</p>
                <p><strong>2.</strong> Approve the payment prompt sent to your phone.</p>
                <p><strong>3.</strong> We&apos;ll confirm here and set things up the same day.</p>
                <p style={{ marginTop: 10 }}>Prefer to pay another way? <a href="/contact" style={{ color: "var(--copper-bright)" }}>Contact us</a> or <a href="https://wa.me/260770346698" target="_blank" rel="noopener" style={{ color: "var(--copper-bright)" }}>WhatsApp</a> instead.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <Script src="/js/checkout.js" strategy="afterInteractive" />
    </>
  );
}
