import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  CloudOff,
  FileCheck2,
  FileLock2,
  FileSignature,
  FlaskConical,
  LayoutDashboard,
  Lock,
  ShieldCheck,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { APP_DESCRIPTION, APP_NAME, SITE_URL } from "@/lib/config/site";
import { serializeJsonLd } from "@/lib/utils/json-ld";
import { MarketingAuth } from "@/components/auth/marketing-auth";

const capabilities = [
  {
    icon: CloudOff,
    title: "Offline-first field records",
    copy: "Jobs, treatments, and evidence keep moving and sync when signal returns.",
  },
  {
    icon: FlaskConical,
    title: "Chemical traceability",
    copy: "Product, dose, and branch stock are recorded against each treatment.",
  },
  {
    icon: FileSignature,
    title: "Signatures & evidence",
    copy: "Customer signatures and field evidence attach to the job record.",
  },
  {
    icon: FileCheck2,
    title: "Immutable report versions",
    copy: "Reviewed reports reach the portal with a versioned history.",
  },
];

const workflow = [
  { number: "01", title: "Schedule", copy: "Customers, sites, branches, and accountable assignments." },
  { number: "02", title: "Treat", copy: "Offline field records, chemical traceability, evidence, and signatures." },
  { number: "03", title: "Approve", copy: "Configurable review gates with immutable operational history." },
  { number: "04", title: "Deliver", copy: "A secure customer portal with trusted reports and acceptance." },
];

const roles = [
  {
    icon: LayoutDashboard,
    name: "Fumivanta Desk",
    line: "Operations and management workspace.",
    copy: "Plan jobs, review evidence, manage stock, and approve reports.",
    label: "Open the desk",
    href: ROUTES.dashboard,
  },
  {
    icon: Smartphone,
    name: "Fumivanta Field",
    line: "Technician-first offline PWA.",
    copy: "Record treatments, chemicals, and signatures on site with no signal needed.",
    label: "Open field mode",
    href: ROUTES.field,
  },
  {
    icon: FileLock2,
    name: "Fumivanta Portal",
    line: "Customer report and acceptance area.",
    copy: "Customers review approved reports and record acceptance in one place.",
    label: "Open the portal",
    href: ROUTES.portalReports,
  },
];

const trust = [
  {
    icon: Lock,
    title: "Branch-scoped access",
    copy: "Customers, sites, and reports stay scoped to their branch.",
  },
  {
    icon: ShieldCheck,
    title: "Sensitive by design",
    copy: "Signatures and location are treated as sensitive and never logged.",
  },
  {
    icon: WifiOff,
    title: "Offline-first",
    copy: "Field work never waits on a signal to record.",
  },
  {
    icon: FileCheck2,
    title: "Audit-minded",
    copy: "Every review and acceptance leaves a durable operational history.",
  },
];

const ledgerStrip = [
  { value: "04 / 04", label: "Operational chain steps" },
  { value: "OFFLINE", label: "Field mode keeps working" },
  { value: "3 AREAS", label: "Desk · Field · Portal" },
  { value: "DURABLE", label: "Offline outbox syncs later" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: APP_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: APP_DESCRIPTION,
  ...(SITE_URL ? { url: SITE_URL } : {}),
};

const navLinks = [
  { href: "#capabilities", label: "Capabilities" },
  { href: "#workflow", label: "Workflow" },
  { href: "#roles", label: "Roles" },
  { href: "#trust", label: "Trust" },
];

export default function HomePage() {
  return (
    <main className="marketing-shell">
      <a className="skip-link" href="#content">
        Skip to content
      </a>

      <nav className="marketing-nav" aria-label="Primary navigation">
        <Link className="wordmark" href={ROUTES.home}>
          <span className="wordmark-mark" aria-hidden="true">F</span>
          <span>Fumivanta</span>
        </Link>
        <ul className="nav-links">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link className="nav-link" href={link.href}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <MarketingAuth />
      </nav>

      <header className="hero" id="content">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" aria-hidden="true" />
              Fumigation operations, evidenced
            </p>
            <h1>
              From treatment to <em>trusted report.</em>
            </h1>
            <p className="hero-lede">
              Fumivanta keeps field work moving without a signal and gives the desk
              a clear line from job to approved report.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={ROUTES.dashboard}>
                <ClipboardCheck aria-hidden="true" size={18} />
                Enter Fumivanta Desk
              </Link>
              <Link className="button button-secondary" href={ROUTES.field}>
                <CloudOff aria-hidden="true" size={18} />
                Open Field mode
              </Link>
            </div>
          </div>

          <aside className="proof-card" aria-label="Platform capabilities">
            <div className="proof-status">
              <span>
                <span className="live-dot" aria-hidden="true" />
                Operational chain
              </span>
              <span className="proof-tag">04 / 04</span>
            </div>
            <div className="proof-icon" aria-hidden="true">
              <FlaskConical size={34} />
            </div>
            <strong>One defensible record.</strong>
            <p>Assignment, treatment, stock use, signatures, review, and delivery stay connected.</p>
            <ul className="proof-list">
              <li><CheckCircle2 aria-hidden="true" size={16} /> Durable offline outbox</li>
              <li><CheckCircle2 aria-hidden="true" size={16} /> Branch-scoped access</li>
              <li><CheckCircle2 aria-hidden="true" size={16} /> Immutable report versions</li>
            </ul>
          </aside>
        </div>
      </header>

      <section className="ledger-strip-section" aria-label="Platform proof">
        <dl className="ledger-strip">
          {ledgerStrip.map((item) => (
            <div className="ledger-item" key={item.label}>
              <dt className="ledger-value">{item.value}</dt>
              <dd className="ledger-label">{item.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section" id="capabilities" aria-labelledby="capabilities-title">
        <div className="section-heading index">
          <span className="section-index" aria-hidden="true">01</span>
          <h2 id="capabilities-title">One defensible record.</h2>
        </div>
        <div className="capabilities-grid">
          {capabilities.map((item, index) => (
            <article className="cap-card" key={item.title}>
              <div className="cap-icon" aria-hidden="true">
                <item.icon size={22} />
              </div>
              <span className="cap-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="workflow" aria-labelledby="workflow-title">
        <div className="section-heading index">
          <span className="section-index" aria-hidden="true">02</span>
          <h2 id="workflow-title">No missing handoffs.</h2>
        </div>
        <div className="workflow-grid">
          {workflow.map((item) => (
            <article className="workflow-step" key={item.number}>
              <span className="workflow-number">{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="roles" aria-labelledby="roles-title">
        <div className="section-heading">
          <p className="eyebrow">Built for every role</p>
          <h2 id="roles-title">Desk, Field, Portal.</h2>
        </div>
        <div className="roles-list">
          {roles.map((item) => (
            <article className="role-row" key={item.name}>
              <div className="role-icon" aria-hidden="true">
                <item.icon size={22} />
              </div>
              <div className="role-body">
                <h3>{item.name}</h3>
                <p>{item.line}</p>
                <p className="role-copy">{item.copy}</p>
              </div>
              <Link className="text-link" href={item.href}>
                {item.label} <ArrowUpRight aria-hidden="true" size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section-trust" id="trust" aria-labelledby="trust-title">
        <div className="section-heading index">
          <span className="section-index" aria-hidden="true">03</span>
          <h2 id="trust-title">Your data stays operational.</h2>
        </div>
        <div className="trust-grid">
          <div className="trust-copy">
            <p>
              Fumivanta treats operational records like a field ledger: scoped,
              sensitive by default, and durable through every handoff.
            </p>
            <div className="trust-actions">
              <Link className="button button-primary" href={ROUTES.dashboard}>
                <ClipboardCheck aria-hidden="true" size={18} />
                Enter Fumivanta Desk
              </Link>
            </div>
            <p className="trust-note">
              Regulatory readiness depends on deployment-specific validation. We do
              not claim compliance by default.
            </p>
          </div>
          <ul className="trust-list">
            {trust.map((item) => (
              <li key={item.title}>
                <div className="trust-list-icon" aria-hidden="true">
                  <item.icon size={18} />
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="marketing-footer">
        <div className="footer-brand">
          <Link className="wordmark" href={ROUTES.home}>
            <span className="wordmark-mark" aria-hidden="true">F</span>
            <span>Fumivanta</span>
          </Link>
          <p>From treatment to trusted report.</p>
        </div>
        <div className="footer-col">
          <h4>Product</h4>
          <ul>
            <li><Link href={ROUTES.dashboard}>Desk</Link></li>
            <li><Link href={ROUTES.field}>Field</Link></li>
            <li><Link href={ROUTES.portalReports}>Portal</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Explore</h4>
          <ul>
            <li><a href="#capabilities">Capabilities</a></li>
            <li><a href="#workflow">Workflow</a></li>
            <li><a href="#trust">Trust posture</a></li>
          </ul>
        </div>
        <div className="footer-meta">
          <p>Pre-launch MVP · © 2026 Matthew Makundi · SpookieLabs Inc.</p>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    </main>
  );
}
