"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORY_LABELS,
  parametersFor,
  ReviewerCategory,
} from "@/lib/ratingParameters";
import { AMENITIES } from "@/lib/amenities";

const EMP_TYPES: Record<ReviewerCategory, [string, string][]> = {
  teaching_faculty: [
    ["permanent", "Permanent"],
    ["tenure_track", "Tenure track"],
    ["contract", "Contract"],
    ["adhoc_guest", "Ad-hoc / Guest"],
    ["visiting", "Visiting"],
    ["other", "Other"],
  ],
  non_teaching_staff: [
    ["permanent", "Permanent"],
    ["contract", "Contract"],
    ["project_staff", "Project staff"],
    ["other", "Other"],
  ],
  research_scholar: [
    ["phd_scholar", "PhD scholar"],
    ["postdoc", "Postdoc"],
    ["project_staff", "Project JRF/SRF/RA"],
    ["other", "Other"],
  ],
};

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span className="starpick">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={n <= value ? "on" : ""} onClick={() => onChange(n)} aria-label={`${n} star`}>
          ★
        </button>
      ))}
    </span>
  );
}

export default function ReviewForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [category, setCategory] = useState<ReviewerCategory>("teaching_faculty");
  const [scores, setScores] = useState<Record<number, number>>({});
  const [overall, setOverall] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amenities, setAmenities] = useState<Record<string, string>>({});

  const params = useMemo(() => parametersFor(category), [category]);

  function setScore(id: number, n: number) {
    setScores((s) => ({ ...s, [id]: n }));
  }
  function setAmenity(code: string, val: string) {
    setAmenities((a) => ({ ...a, [code]: val }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const missing = params.filter((p) => p.isCore && !scores[p.id]);
    if (overall === 0) return setError("Please give an overall rating.");
    if (missing.length) return setError(`Please rate: ${missing.map((m) => m.label).join(", ")}`);

    const fd = new FormData(e.currentTarget);
    const payload = {
      slug,
      category,
      empStatus: fd.get("empStatus"),
      empType: fd.get("empType"),
      designation: fd.get("designation"),
      department: fd.get("department"),
      startYear: fd.get("startYear") ? Number(fd.get("startYear")) : null,
      endYear: fd.get("endYear") ? Number(fd.get("endYear")) : null,
      title: fd.get("title"),
      pros: fd.get("pros"),
      cons: fd.get("cons"),
      adviceToMgmt: fd.get("adviceToMgmt"),
      adviceToCandidate: fd.get("adviceToCandidate"),
      overallRating: overall,
      wouldRecommend: fd.get("wouldRecommend") === "yes",
      scores: params.map((p) => ({ parameterId: p.id, score: scores[p.id] ?? null })).filter((s) => s.score),
      amenities: Object.fromEntries(
        Object.entries(amenities)
          .filter(([, v]) => v === "yes" || v === "no")
          .map(([k, v]) => [k, v === "yes"]),
      ),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      router.push(`/institutions/${slug}?submitted=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <label>I am / was a…</label>
      <select value={category} onChange={(e) => { setCategory(e.target.value as ReviewerCategory); setScores({}); }}>
        {(Object.keys(CATEGORY_LABELS) as ReviewerCategory[]).map((c) => (
          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
        ))}
      </select>

      <div className="grid2">
        <div>
          <label>Employment status</label>
          <select name="empStatus" defaultValue="former">
            <option value="current">Currently working here</option>
            <option value="former">Formerly worked here</option>
          </select>
        </div>
        <div>
          <label>Employment type</label>
          <select name="empType">
            {EMP_TYPES[category].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid2">
        <div>
          <label>Designation / role <span className="field-hint">(no personal names)</span></label>
          <input name="designation" placeholder="e.g. Assistant Professor, Lab Assistant, JRF" />
        </div>
        <div>
          <label>Department <span className="field-hint">(optional)</span></label>
          <input name="department" placeholder="e.g. Physics, Administration" />
        </div>
      </div>

      <div className="grid2">
        <div>
          <label>Start year</label>
          <input name="startYear" type="number" min={1950} max={2100} placeholder="2019" />
        </div>
        <div>
          <label>End year <span className="field-hint">(leave blank if current)</span></label>
          <input name="endYear" type="number" min={1950} max={2100} placeholder="2023" />
        </div>
      </div>

      <label style={{ marginTop: 18 }}>Rate your experience</label>
      <p className="field-hint" style={{ marginTop: 2 }}>
        Not sure where your issue fits? Each rating shows what it covers — hover the note under it.
        Anything specific that isn&rsquo;t a category here, spell out in Pros &amp; Cons below.
      </p>
      <div className="rating-row">
        <strong>Overall</strong>
        <StarPicker value={overall} onChange={setOverall} />
      </div>
      {params.map((p) => (
        <div className="rating-row" key={p.id}>
          <span>
            {p.label}
            {p.isCore ? "" : <span className="field-hint"> (optional)</span>}
            <div className="field-hint">{p.description}</div>
          </span>
          <StarPicker value={scores[p.id] ?? 0} onChange={(n) => setScore(p.id, n)} />
        </div>
      ))}

      <label style={{ marginTop: 18 }}>Amenities <span className="field-hint">— what this employer actually provides (optional)</span></label>
      {AMENITIES.map((a) => (
        <div className="rating-row" key={a.code}>
          <span>{a.label}</span>
          <select
            value={amenities[a.code] ?? ""}
            onChange={(e) => setAmenity(a.code, e.target.value)}
            style={{ width: "auto", minWidth: 150 }}
          >
            <option value="">— not sure —</option>
            <option value="yes">Available</option>
            <option value="no">Not available</option>
          </select>
        </div>
      ))}

      <label style={{ marginTop: 18 }}>Headline</label>
      <input name="title" required maxLength={120} placeholder="Sum up your experience in one line" />

      <label>Pros <span className="field-hint">— what is genuinely good here</span></label>
      <textarea name="pros" required rows={3} minLength={20} placeholder="At least 20 characters" />

      <label>Cons <span className="field-hint">— the real problems (be specific, stay factual)</span></label>
      <textarea name="cons" required rows={3} minLength={20} placeholder="At least 20 characters" />

      <label>Advice to management <span className="field-hint">(optional)</span></label>
      <textarea name="adviceToMgmt" rows={2} />

      <label>Advice to someone considering joining <span className="field-hint">(optional)</span></label>
      <textarea name="adviceToCandidate" rows={2} />

      <label>Would you recommend this employer?</label>
      <select name="wouldRecommend" defaultValue="yes">
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>

      <p className="small muted" style={{ marginTop: 14 }}>
        By submitting you confirm this is your own honest, first-hand experience and does not name or
        target any individual. Reviews are checked before publishing.
      </p>

      {error ? <p style={{ color: "var(--bad)" }} className="small">{error}</p> : null}

      <button className="btn" type="submit" disabled={submitting} style={{ marginTop: 8 }}>
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
