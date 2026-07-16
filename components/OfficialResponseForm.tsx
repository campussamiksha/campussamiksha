"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OfficialResponseForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: fd.get("body") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn secondary" style={{ marginTop: 6 }} onClick={() => setOpen(true)} type="button">
        Post official response
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 8 }}>
      <textarea name="body" required rows={3} minLength={20} placeholder="Respond professionally on behalf of the institution (min 20 characters). This is public and moderated." />
      {error ? <p className="small" style={{ color: "var(--bad)" }}>{error}</p> : null}
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button className="btn" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit response"}</button>
        <button className="btn secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
