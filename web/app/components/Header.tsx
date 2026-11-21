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
      {/* Thin top bar (laptops/desktops): contact, sales, sign in, currency */}
      <div className="topbar">
        <div className="wrap topbar-inner">
          <div className="topbar-left">
            <a href="/contact">Contact us</a>
            <a href="/signup" id="tbSignup" aria-current={current("/signup")}>Sign up</a>
            {/* /js/main.js swaps these for "Hi, <name>" + "Log out" when the visitor is logged in */}
            <a href="/account" id="tbSignin" className="topbar-signin" aria-current={current("/account")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="8" r="4.2" />
                <path d="M3.5 21c.8-4.3 4.3-7 8.5-7s7.7 2.7 8.5 7z" />
              </svg>
              <span id="tbSigninText">Sign in</span>
            </a>
          </div>
          <div className="topbar-right">
            {/* Currency picker; filled in by /js/currency.js */}
            <div className="cur-picker" id="curPicker" suppressHydrationWarning />
            <a href="mailto:info@nadinecloud.com" className="topbar-icon" aria-label="Email us">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </a>
            <a href="/domains" className="topbar-icon" aria-label="Search domains">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="wrap nav">
        <a className="logo" href="/" aria-label="Nadine Cloud home">
          <img src="/assets/logo-header.png" alt="Nadine Cloud" className="logo-img" />
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
                <a href="/deploy">
                  Deploy from GitHub <span className="badge-new">New</span>
                </a>
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
            <li className="nav-vault">
              <a href="/vault" aria-current={current("/vault")}>
                Vault <span className="badge-new">New</span>
              </a>
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
            <li className="nav-wide">
              <a href="/domains#transfer">
                Transfer <span className="badge-try">Try Me</span>
              </a>
            </li>
            <li className="nav-wide">
              <a href="/work" aria-current={current("/work")}>
                Our work
              </a>
            </li>
            <li className="nav-wide">
              <a href="/about" aria-current={current("/about")}>
                About
              </a>
            </li>
            {/* On medium-width laptops the three links above move into this "More" menu so everything fits */}
            <li className="has-dropdown nav-more">
              <a href="/about">
                More <NavCaret />
              </a>
              <div className="nav-dropdown">
                <a href="/domains#transfer">
                  Transfer a domain <span className="badge-try">Try Me</span>
                </a>
                <a href="/work">Our work</a>
                <a href="/about">About us</a>
                <a href="mailto:info@nadinecloud.com?body=Hi%20Nadine%20Cloud%2C%20I%27d%20like%20to%20talk%20to%20sales." target="_blank" rel="noopener">
                  Talk to sales
                </a>
              </div>
            </li>
            <li>
              <a href="/contact" aria-current={current("/contact")}>
                Contact
              </a>
            </li>
          </ul>
        </nav>
        <div className="nav-actions">
          <a className="btn-sm ghost nav-account" href="/account" aria-current={current("/account")}>
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
