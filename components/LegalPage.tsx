import Link from "next/link";
import { LEGAL } from "@/lib/legal";

// Shared shell for legal pages: draft banner, title, effective date, prose.
export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="prose">
      <div className="draft-banner">
        <strong>⚠️ Draft template — not legal advice.</strong> Have a qualified Indian lawyer
        review and adapt this before publishing. Bracketed <code>[…]</code> values are placeholders.
      </div>
      <h1 style={{ marginBottom: 4 }}>{title}</h1>
      <p className="small muted" style={{ marginTop: 0 }}>
        {LEGAL.siteName} · Effective {LEGAL.effectiveDate}
      </p>
      {children}
      <hr style={{ margin: "28px 0", border: "none", borderTop: "1px solid var(--line)" }} />
      <p className="small muted">
        Related: <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> ·{" "}
        <Link href="/guidelines">Guidelines</Link> · <Link href="/grievance">Grievance &amp; Takedown</Link>
      </p>
    </div>
  );
}
