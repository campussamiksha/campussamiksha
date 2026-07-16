"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");

      if (mode === "signup" && data.devVerifyUrl) {
        // Dev convenience: surface the verification link instead of emailing it.
        setNotice(`Account created. Verify your email to post reviews: ${data.devVerifyUrl}`);
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>{mode === "login" ? "Log in" : "Create an account"}</h1>

      {mode === "signup" && (
        <>
          <label>Display handle <span className="field-hint">(optional, shown on reviews)</span></label>
          <input name="displayHandle" placeholder="e.g. anon_scholar" maxLength={40} />
        </>
      )}

      <label>Email</label>
      <input name="email" type="email" required placeholder="you@example.com" />

      <label>Password</label>
      <input name="password" type="password" required minLength={mode === "signup" ? 8 : 1}
             placeholder={mode === "signup" ? "At least 8 characters" : ""} />

      {error ? <p className="small" style={{ color: "var(--bad)" }}>{error}</p> : null}
      {notice ? (
        <p className="small" style={{ color: "var(--good)", wordBreak: "break-all" }}>
          {notice.split(": ")[0]}:{" "}
          <Link href={notice.split(": ").slice(1).join(": ")}>click here to verify</Link>
        </p>
      ) : null}

      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 12 }}>
        {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
      </button>

      <p className="small muted" style={{ marginTop: 14 }}>
        {mode === "login" ? (
          <>No account? <Link href="/signup">Sign up</Link></>
        ) : (
          <>Already registered? <Link href="/login">Log in</Link></>
        )}
      </p>
    </form>
  );
}
