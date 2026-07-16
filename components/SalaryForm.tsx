"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, ReviewerCategory } from "@/lib/ratingParameters";
import { EMP_TYPES, CURRENCIES } from "@/lib/formOptions";

export default function SalaryForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [category, setCategory] = useState<ReviewerCategory>("teaching_faculty");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empTypes = useMemo(() => EMP_TYPES[category], [category]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const num = (k: string) => (fd.get(k) ? Number(fd.get(k)) : null);
    try {
      const res = await fetch("/api/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          category,
          empType: fd.get("empType"),
          designation: fd.get("designation") || undefined,
          department: fd.get("department") || undefined,
          yearsExperience: num("yearsExperience"),
          payScale: fd.get("payScale") || undefined,
          grossMonthly: num("grossMonthly"),
          annualCtc: num("annualCtc"),
          currency: fd.get("currency"),
          paidOnTime: fd.get("paidOnTime") === "" ? null : fd.get("paidOnTime") === "yes",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      router.push(`/institutions/${slug}?submitted=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <label>I am / was a…</label>
      <select value={category} onChange={(e) => setCategory(e.target.value as ReviewerCategory)}>
        {(Object.keys(CATEGORY_LABELS) as ReviewerCategory[]).map((c) => (
          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
        ))}
      </select>

      <div className="grid2">
        <div>
          <label>Employment type</label>
          <select name="empType">
            {empTypes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label>Years of experience</label>
          <input name="yearsExperience" type="number" min={0} max={60} placeholder="e.g. 5" />
        </div>
      </div>

      <div className="grid2">
        <div>
          <label>Designation</label>
          <input name="designation" placeholder="e.g. Associate Professor" />
        </div>
        <div>
          <label>Department <span className="field-hint">(optional)</span></label>
          <input name="department" placeholder="e.g. Chemistry" />
        </div>
      </div>

      <label>Pay scale <span className="field-hint">(optional)</span></label>
      <input name="payScale" placeholder="e.g. Academic Level 12 (7th CPC)" />

      <div className="grid2">
        <div>
          <label>Gross monthly</label>
          <input name="grossMonthly" type="number" min={0} step="0.01" placeholder="e.g. 120000" />
        </div>
        <div>
          <label>Annual CTC</label>
          <input name="annualCtc" type="number" min={0} step="0.01" placeholder="e.g. 1600000" />
        </div>
      </div>
      <p className="field-hint">Enter at least one of monthly gross or annual CTC.</p>

      <div className="grid2">
        <div>
          <label>Currency</label>
          <select name="currency" defaultValue="INR">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label>Paid on time?</label>
          <select name="paidOnTime" defaultValue="">
            <option value="">Prefer not to say</option>
            <option value="yes">Yes, always on time</option>
            <option value="no">No, delays occurred</option>
          </select>
        </div>
      </div>

      <p className="small muted" style={{ marginTop: 12 }}>
        Salary data is shown anonymously and aggregated. It helps candidates gauge pay fairness.
      </p>
      {error ? <p className="small" style={{ color: "var(--bad)" }}>{error}</p> : null}
      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 6 }}>
        {busy ? "Submitting…" : "Submit salary"}
      </button>
    </form>
  );
}
