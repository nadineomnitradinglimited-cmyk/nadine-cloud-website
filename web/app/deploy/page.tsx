import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TITLE = "Deploy your website — GitHub, Node.js, WordPress | Nadine Cloud";
const DESCRIPTION =
  "Step-by-step guides to put your site live on Nadine Cloud hosting: deploy from GitHub, run Node.js apps, install WordPress in one click, or build with Sitejet.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.nadinecloud.com/deploy" },
  openGraph: {
    type: "website",
    siteName: "Nadine Cloud",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.nadinecloud.com/deploy",
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.nadinecloud.com/assets/hero-servers.jpg"],
  },
};

const CPANEL_YML = `---
deployment:
  tasks:
    - export DEPLOYPATH=/home/YOUR_CPANEL_USERNAME/public_html/
    - /bin/cp -R * $DEPLOYPATH`;

const WA_HELP =
  "https://wa.me/260964068483?text=Hi%20Nadine%20Cloud%2C%20I%20need%20help%20deploying%20my%20website.";

export default function Deploy() {
  return (
    <>
      <Header getStartedHref="/hosting#hosting" />

      <section className="page-hero">
        <div className="wrap page-hero-inner">
          <span className="eyebrow">Help center · Deploy</span>
          <h1>Put your website live in minutes.</h1>
          <p>
            Every Nadine Cloud hosting plan comes with cPanel, Git, Node.js,
            WordPress Manager and Sitejet Builder. Pick the guide that matches
            your project.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Choose your path</span>
            <h2>What are you deploying?</h2>
            <p>All steps start in your cPanel. You get its login by email after checkout.</p>
          </div>
          <div className="guide-picker">
            <a href="#wordpress"><b>WordPress site</b><span>One click · easiest</span></a>
            <a href="#sitejet"><b>No website yet</b><span>Drag &amp; drop with Sitejet</span></a>
            <a href="#github"><b>HTML / PHP from GitHub</b><span>Git Version Control</span></a>
            <a href="#nodejs"><b>Node.js app</b><span>Express, Next.js, APIs</span></a>
          </div>
        </div>
      </section>

      <section className="section guide" id="wordpress">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Guide 1 · Easiest</span>
            <h2>Install WordPress in one click</h2>
          </div>
          <ol className="guide-steps">
            <li>Log in to <b>cPanel</b> and open <b>WordPress Manager</b>.</li>
            <li>Click <b>Install</b>, choose your domain, and set your site name, admin username and a strong password.</li>
            <li>Click <b>Install</b> again. After a minute, log in at <code>yourdomain.com/wp-admin</code>.</li>
          </ol>
          <p className="guide-note">Updates, backups and plugins can all be managed from the same WordPress Manager screen.</p>
        </div>
      </section>

      <section className="section guide" id="sitejet" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Guide 2 · No coding</span>
            <h2>Build your site with Sitejet Builder</h2>
          </div>
          <ol className="guide-steps">
            <li>In <b>cPanel</b>, open <b>Sitejet Builder</b>.</li>
            <li>Pick a template, then drag and drop to add your text, photos and contact details.</li>
            <li>Click <b>Publish</b>. Your site goes live on your domain straight away.</li>
          </ol>
          <p className="guide-note">Prefer us to build it for you? See our <a href="/services">web design service</a>.</p>
        </div>
      </section>

      <section className="section guide" id="github">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Guide 3 · Developers</span>
            <h2>Deploy an HTML / PHP site from GitHub</h2>
            <p>Works for static sites and plain PHP projects (HTML, CSS, JavaScript, PHP).</p>
          </div>
          <ol className="guide-steps">
            <li>
              In your GitHub repository, add a file called <code>.cpanel.yml</code> at the top level,
              with this content (replace <code>YOUR_CPANEL_USERNAME</code>), then commit and push it:
              <pre className="guide-code">{CPANEL_YML}</pre>
              This tells cPanel to copy your files into your live website folder.
            </li>
            <li>In <b>cPanel</b>, open <b>Git™ Version Control</b> and click <b>Create</b>.</li>
            <li>
              Paste your repository&apos;s <b>Clone URL</b>, for example{" "}
              <code>https://github.com/your-name/your-site.git</code>. Leave the suggested
              <b> Repository Path</b> (for example <code>repositories/your-site</code>), then click <b>Create</b>.
            </li>
            <li>
              Click <b>Manage</b> next to the repository, open the <b>Pull or Deploy</b> tab and click{" "}
              <b>Deploy HEAD Commit</b>. Your site is now live.
            </li>
          </ol>
          <h3 className="guide-sub">Updating your site</h3>
          <p>Push your changes to GitHub as usual. Then in <b>Git™ Version Control → Manage → Pull or Deploy</b>, click <b>Update from Remote</b> and then <b>Deploy HEAD Commit</b>.</p>
          <h3 className="guide-sub">Private repository?</h3>
          <p>
            Create a <b>fine-grained personal access token</b> on GitHub with read-only access to that
            one repository, and use it in the clone URL:{" "}
            <code>https://YOUR_TOKEN@github.com/your-name/your-site.git</code>. Keep the token private
            and give it an expiry date.
          </p>
        </div>
      </section>

      <section className="section guide" id="nodejs" style={{ background: "var(--sky)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Guide 4 · Developers</span>
            <h2>Run a Node.js app</h2>
            <p>For Express APIs, Next.js, Nest and other Node.js servers.</p>
          </div>
          <ol className="guide-steps">
            <li>
              Make sure your app starts its server on the port it is given:{" "}
              <code>app.listen(process.env.PORT || 3000)</code>.
            </li>
            <li>
              Get your code onto the server with <b>Git™ Version Control</b> (steps 2–3 of Guide 3 —
              you don&apos;t need <code>.cpanel.yml</code> for Node.js). Your code stays in{" "}
              <code>repositories/your-app</code>, <b>outside</b> your public website folder, so your
              source code and secrets are never downloadable.
            </li>
            <li>
              In <b>File Manager</b>, create a folder called <code>logs</code> in your home folder.
              This is where your app&apos;s error messages will be saved.
            </li>
            <li>
              Open <b>Setup Node.js App</b> and click <b>Create Application</b>:
              <ul>
                <li><b>Node.js version:</b> the newest one offered</li>
                <li><b>Application mode:</b> Production</li>
                <li><b>Application root:</b> <code>repositories/your-app</code> (the folder that contains <code>package.json</code>)</li>
                <li><b>Application URL:</b> your domain</li>
                <li><b>Application startup file:</b> your main file, e.g. <code>server.js</code> or <code>app.js</code></li>
                <li><b>Passenger log file:</b> <code>/home/YOUR_CPANEL_USERNAME/logs/app.log</code></li>
              </ul>
              Click <b>Create</b>.
            </li>
            <li>Click <b>Run NPM Install</b>. Add any settings your app needs (like <code>DATABASE_URL</code>) under <b>Environment variables</b>, then click <b>Restart</b>.</li>
          </ol>
          <h3 className="guide-sub">Updating your app</h3>
          <p>In <b>Git™ Version Control</b>, click <b>Update from Remote</b>, then in <b>Setup Node.js App</b> click <b>Run NPM Install</b> (if your packages changed) and <b>Restart</b>.</p>
          <h3 className="guide-sub">Need a database?</h3>
          <p>Use <b>MySQL® Database Wizard</b> or <b>PostgreSQL Databases</b> in cPanel to create a database and user, then put the details in your app&apos;s environment variables.</p>
        </div>
      </section>

      <section className="section" id="troubleshooting">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Troubleshooting</span>
            <h2>Something not working?</h2>
          </div>
          <div className="faq">
            <details className="faq-item" open>
              <summary>Setup Node.js App shows &quot;Error&quot; when I save</summary>
              <p>Check that the <b>startup file</b> really exists inside the <b>application root</b> (not one folder deeper), and that the <code>logs</code> folder in your log file path exists. Then save again.</p>
            </details>
            <details className="faq-item">
              <summary>My Node.js app shows &quot;could not be started&quot;</summary>
              <p>Open your log file (<code>logs/app.log</code>) in File Manager — the real error is written there. Most often it&apos;s a missing environment variable or a package that wasn&apos;t installed: click <b>Run NPM Install</b> and <b>Restart</b>.</p>
            </details>
            <details className="faq-item">
              <summary>Git says the repository can&apos;t be deployed</summary>
              <p>cPanel only deploys when <code>.cpanel.yml</code> is committed at the top level of the repository and the server copy has no uncommitted changes. Check the file name (it starts with a dot) and push again.</p>
            </details>
            <details className="faq-item">
              <summary>My site needs a build step (React, Vite, Angular)</summary>
              <p>Run the build on your computer (for example <code>npm run build</code>) and deploy the output folder (<code>dist</code> or <code>build</code>) the same way as Guide 3.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="wrap">
          <span className="eyebrow">We&apos;re here to help</span>
          <h2>Stuck? Our team will deploy it with you.</h2>
          <p>Send us your GitHub link and what you&apos;re building — we&apos;ll get it live.</p>
          <div className="actions">
            <a className="btn-primary" href={WA_HELP} target="_blank" rel="noopener">Chat on WhatsApp</a>
            <a className="btn-ghost" href="/hosting#hosting">See hosting plans</a>
          </div>
        </div>
      </section>

      <Footer
        supportLinks={[
          { href: "/deploy", label: "Deploy guides" },
          { href: "/hosting#faq", label: "Help center" },
          { href: "/contact", label: "Contact us" },
        ]}
      />
    </>
  );
}
