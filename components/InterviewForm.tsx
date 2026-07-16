"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, ReviewerCategory } from "@/lib/ratingParameters";
import { INTERVIEW_OUTCOMES } from "@/lib/formOptions";

export default function InterviewForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          category: fd.get("category"),
          positionApplied: fd.get("positionApplied") || undefined,
          department: fd.get("department") || undefined,
          outcome: fd.get("outcome"),
          offerAccepted: fd.get("offerAccepted") === "" ? null : fd.get("offerAccepted") === "yes",
          difficulty: difficulty || null,
          processDescription: fd.get("processDescription") || undefined,
          questionsAsked: fd.get("questionsAsked") || undefined,
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
      <div className="grid2">
        <div>
          <label>Role type</label>
          <select name="category" defaultValue="teaching_faculty">
            {(Object.keys(CATEGORY_LABELS) as ReviewerCategory[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Position applied for</label>
          <input name="positionApplied" placeholder="e.g. Assistant Professor" />
        </div>
      </div>

      <label>Department <span className="field-hint">(optional)</span></label>
      <input name="department" placeholder="e.g. Mathematics" />

      <div className="grid2">
        <div>
          <label>Outcome</label>
          <select name="outcome" defaultValue="offer">
            {INTERVIEW_OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label>Did you accept the offer?</label>
          <select name="offerAccepted" defaultValue="">
            <option value="">N/A</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <label>Difficulty</label>
      <span className="starpick">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} className={n <= difficulty ? "on" : ""} onClick={() => setDifficulty(n)} aria-label={`${n}`}>★</button>
        ))}
      </span>

      <label>Interview process <span className="field-hint">(rounds, format — no personal names)</span></label>
      <textarea name="processDescription" rows={3} placeholder="e.g. Seminar presentation, then a panel interview with the selection committee." />

      <label>Questions asked <span className="field-hint">(optional)</span></label>
      <textarea name="questionsAsked" rows={2} />

      <p className="small muted" style={{ marginTop: 12 }}>
        Describe the process, not individuals. Shared anonymously to help future candidates prepare.
      </p>
      {error ? <p className="small" style={{ color: "var(--bad)" }}>{error}</p> : null}
      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 6 }}>
        {busy ? "Submitting…" : "Submit interview experience"}
      </button>
    </form>
  );
}
