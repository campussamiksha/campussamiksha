"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Sel = { slug: string; name: string };
type Hit = { slug: string; name: string; state: string | null };

export default function CompareBar({ selected }: { selected: Sel[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const full = selected.length >= 4;

  function go(slugs: string[]) {
    router.push(slugs.length ? "/compare?" + slugs.map((s) => "i=" + encodeURIComponent(s)).join("&") : "/compare");
  }

  async function search(v: string) {
    setQ(v);
    if (v.trim().length < 2) { setHits([]); return; }
    try {
      const res = await fetch(`/api/institutions?q=${encodeURIComponent(v)}`);
      const data = await res.json();
      const have = new Set(selected.map((s) => s.slug));
      setHits((data.institutions as Hit[]).filter((h) => !have.has(h.slug)).slice(0, 6));
    } catch { setHits([]); }
  }

  function add(slug: string) {
    go([...selected.map((s) => s.slug), slug].slice(0, 4));
    setQ(""); setHits([]);
  }
  function remove(slug: string) {
    go(selected.map((s) => s.slug).filter((s) => s !== slug));
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: selected.length ? 12 : 0 }}>
        {selected.map((s) => (
          <span key={s.slug} className="tag" style={{ padding: "6px 10px", fontSize: 13 }}>
            {s.name}
            <button type="button" onClick={() => remove(s.slug)} aria-label="Remove"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", marginLeft: 6, padding: 0, width: "auto", fontSize: 14 }}>×</button>
          </span>
        ))}
      </div>
      {!full ? (
        <div style={{ position: "relative", maxWidth: 460 }}>
          <input value={q} onChange={(e) => search(e.target.value)} placeholder={selected.length ? "Add another institution…" : "Add an institution to compare…"} />
          {hits.length > 0 && (
            <div className="typeahead">
              {hits.map((h) => (
                <button type="button" key={h.slug} className="typeahead-item" onClick={() => add(h.slug)}>
                  <strong>{h.name}</strong>{h.state ? <span className="muted small"> · {h.state}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>You can compare up to 4 at a time. Remove one to add another.</p>
      )}
    </div>
  );
}
