import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <h4>Nadine Cloud</h4>
            <p>
              Web design, cloud hosting, domains and business email for
              businesses worldwide. A service of Nadine Omni Trading
              Limited.
            </p>
            <p style={{ marginTop: 14 }}>
              <a
                href="mailto:info@nadinecloud.com"
                style={{ fontFamily: "var(--mono)", fontSize: 13 }}
              >
                info@nadinecloud.com
              </a>
            </p>
          </div>
          <div>
            <h4>Products</h4>
            <ul>
              <li>
                <Link href="/services">Web design</Link>
              </li>
              <li>
                <Link href="/hosting">Cloud hosting</Link>
              </li>
              <li>
                <Link href="/domains">Domains</Link>
              </li>
              <li>
                <Link href="/hosting#email">Business email</Link>
              </li>
              <li>
                <Link href="/marketing">Marketing</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li>
                <Link href="/hosting#security">Security</Link>
              </li>
              <li>
                <Link href="/hosting#migrate">Migrate your hosting</Link>
              </li>
              <li>
                <Link href="/hosting#faq">Help center</Link>
              </li>
              <li>
                <Link href="/contact">Contact us</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li>
                <Link href="/work">Our work</Link>
              </li>
              <li>
                <Link href="/terms">Terms of service</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy policy</Link>
              </li>
              <li>
                <Link href="/refund">Refund policy</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 Nadine Omni Trading Limited. All rights reserved.</span>
          <span>Serving clients worldwide</span>
        </div>
      </div>
    </footer>
  );
}
