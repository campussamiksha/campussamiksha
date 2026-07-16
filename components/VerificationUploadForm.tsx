"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { slug: string; name: string };

const DOC_TYPES: [string, string][] = [
  ["appointment_letter", "Appointment / offer letter"],
  ["payslip", "Salary slip"],
  ["id_card", "Employee ID card"],
  ["institutional_email", "Institutional email proof"],
];

export default function VerificationUploadForm({
  institutions,
  preselect,
}: {
  institutions: Option[];
  preselect?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    // Multipart: send the FormData directly (do NOT set Content-Type manually).
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/verification", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card" style={{ background: "#e7f6ef", borderColor: "#bfe6d3" }}>
        <strong style={{ color: "var(--good)" }}>Proof submitted for review.</strong>
        <div className="small muted">
          A moderator will verify it, then <strong>the file is permanently deleted</strong> — we keep
          only your “Verified employee” badge, never the document.
        </div>
        <button className="btn secondary" style={{ marginTop: 10 }} onClick={() => router.push("/")}>Done</button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <label>Institution</label>
      <select name="institution" defaultValue={preselect ?? ""}>
        <option value="">— select —</option>
        {institutions.map((i) => (
          <option key={i.slug} value={i.slug}>{i.name}</option>
        ))}
      </select>

      <label>Document type</label>
      <select name="docType" required defaultValue="">
        <option value="" disabled>— select —</option>
        {DOC_TYPES.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>

      <label>File <span className="field-hint">(PDF, PNG or JPG · max 5 MB)</span></label>
      <input name="file" type="file" accept="application/pdf,image/png,image/jpeg" required />

      <p className="small muted" style={{ marginTop: 12 }}>
        Your document is used <strong>only</strong> to confirm your employment, is visible only to a
        moderator, and is deleted immediately after review. Feel free to redact salary figures or
        anything you don’t want seen — we only need to confirm the affiliation.
      </p>

      {error ? <p className="small" style={{ color: "var(--bad)" }}>{error}</p> : null}
      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 6 }}>
        {busy ? "Uploading…" : "Submit for verification"}
      </button>
    </form>
  );
}
