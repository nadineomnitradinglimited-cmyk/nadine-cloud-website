"use client";

import { usePathname } from "next/navigation";

function NavCaret() {
  return (
    <svg
      className="nav-caret"
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface HeaderProps {
  getStartedHref?: string;
  hideTalkToSales?: boolean;
  hideGetStarted?: boolean;
}

export default function Header({
  getStartedHref = "/hosting#hosting",
  hideTalkToSales = false,
  hideGetStarted = false,
}: HeaderProps) {
  const pathname = usePathname();
  const current = (href: string) =>
    pathname === href ? "page" : undefined;

  return (
    <header>
      <div className="wrap nav">
        <a className="logo" href="/" aria-label="Nadine Cloud home">
          <svg
            className="logo-mark"
            viewBox="0 0 30 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M22.5 12.2a7.5 7.5 0 0 0-14.6-1.6A6 6 0 0 0 8.5 22.5h13a5.2 5.2 0 0 0 1-10.3Z"
              stroke="#1769FF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Nadine<span className="logo-accent">Cloud</span>
        </a>
        <nav>
          <ul className="nav-links" id="navLinks">
            <li>
              <a href="/services" aria-current={current("/services")}>
                Web Design <span className="badge-new">New</span>
              </a>
            </li>
            <li>
              <a href="/domains" aria-current={current("/domains")}>
                Domains
              </a>
            </li>
            <li className="has-dropdown">
              <a href="/hosting" aria-current={current("/hosting")}>
                Hosting <NavCaret />
              </a>
              <div className="nav-dropdown">
                <a href="/hosting#hosting">Hosting Plans</a>
                <a href="/hosting#email">Business Email</a>
                <a href="/wordpress">
                  Managed WordPress <span className="badge-new">New</span>
                </a>
                <a href="/builder">
                  Website Builder <span className="badge-new">New</span>
                </a>
                <a href="/ssl">
                  SSL Certificates <span className="badge-new">New</span>
                </a>
                <a href="/care">
                  Care Plans <span className="badge-new">New</span>
                </a>
                <a href="/hosting#security">Security</a>
                <a href="/hosting#migrate">Free Migration</a>
                <a href="/hosting#faq">Help Center</a>
              </div>
            </li>
            <li className="has-dropdown">
              <a href="/database" aria-current={current("/database")}>
                Database <span className="badge-new">New</span> <NavCaret />
              </a>
              <div className="nav-dropdown">
                <a href="/database#plans">Database Plans</a>
                <a href="/database#faq">Help Center</a>
              </div>
            </li>
            <li className="has-dropdown">
              <a href="/marketing" aria-current={current("/marketing")}>
                Marketing <span className="badge-new">New</span> <NavCaret />
              </a>
              <div className="nav-dropdown">
                <a href="/marketing#seo">SEO Setup &amp; Optimization</a>
                <a href="/marketing#social">Social Media Management</a>
                <a href="/marketing#email-marketing">
                  Email Marketing Campaigns
                </a>
                <a href="/marketing#ads">Paid Ads Management</a>
              </div>
            </li>
            <li>
              <a href="/domains#transfer">
                Transfer <span className="badge-try">Try Me</span>
              </a>
            </li>
            <li>
              <a href="/work" aria-current={current("/work")}>
                Our work
              </a>
            </li>
            <li>
              <a href="/contact" aria-current={current("/contact")}>
                Contact
              </a>
            </li>
          </ul>
        </nav>
        <div className="nav-actions">
          {!hideTalkToSales && (
            <a
              className="btn-sm ghost"
              href="https://wa.me/260770346698?text=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20talk%20to%20sales."
              target="_blank"
              rel="noopener"
            >
              Talk to sales
            </a>
          )}
          <a className="btn-sm ghost" href="/account" aria-current={current("/account")}>
            Account
          </a>
          {!hideGetStarted && (
            <a className="btn-sm solid" href={getStartedHref}>
              Get started
            </a>
          )}
          <button className="menu-btn" aria-label="Menu">
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
