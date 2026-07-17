"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: fd.get("password") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not reset");
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Invalid link</h1>
        <p className="muted">This reset link is missing or malformed. <Link href="/forgot">Request a new one</Link>.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Password updated ✓</h1>
        <p className="muted">Taking you to log in…</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Choose a new password</h1>
      <label>New password</label>
      <input name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
      {error ? <p className="small" style={{ color: "var(--bad)" }}>{error}</p> : null}
      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 12 }}>
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
