
type LinkItem = { href: string; label: string };

interface FooterProps {
  productsExtra?: LinkItem[];
  supportLinks?: LinkItem[];
}

const DEFAULT_SUPPORT: LinkItem[] = [
  { href: "/hosting#security", label: "Security" },
  { href: "/hosting#migrate", label: "Migrate your hosting" },
  { href: "/hosting#faq", label: "Help center" },
  { href: "/contact", label: "Contact us" },
];

export default function Footer({ productsExtra = [], supportLinks = DEFAULT_SUPPORT }: FooterProps) {
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
                <a href="/services">Web design</a>
              </li>
              <li>
                <a href="/hosting">Cloud hosting</a>
              </li>
              {productsExtra.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
              <li>
                <a href="/domains">Domains</a>
              </li>
              <li>
                <a href="/hosting#email">Business email</a>
              </li>
              <li>
                <a href="/marketing">Marketing</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              {supportLinks.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li>
                <a href="/about">About us</a>
              </li>
              <li>
                <a href="/work">Our work</a>
              </li>
              <li>
                <a href="/terms">Terms of service</a>
              </li>
              <li>
                <a href="/privacy">Privacy policy</a>
              </li>
              <li>
                <a href="/refund">Refund policy</a>
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
