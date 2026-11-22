
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
              A Nadine Technologies company — AI chatbots, robotics, operating
              systems, custom phones, security devices, apps and cloud.
            </p>
            <p style={{ marginTop: 8, fontSize: 13 }}>
              Founded in Oman · Operating in South Africa, Kenya &amp; Zambia
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
              <li>
                <a href="/ai-chatbots">AI Chatbots</a>
              </li>
              <li>
                <a href="/business-systems">Pharmacy &amp; Clinic Systems</a>
              </li>
              <li>
                <a href="/automation">Business Automation</a>
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
          <span>© 2026 Nadine Technologies. All rights reserved.</span>
          <span>Oman · South Africa · Kenya · Zambia</span>
        </div>
      </div>
    </footer>
  );
}
