"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setVerifyUrl(null);
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

      if (mode === "signup" && data.verifyUrl) {
        setVerifyUrl(data.verifyUrl);
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

  // After sign-up: confirm the account and let them verify right away.
  if (verifyUrl) {
    return (
      <div className="card" style={{ maxWidth: 440, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>You&rsquo;re almost in ✓</h1>
        <p className="muted">
          Your account is created. Confirm your email to start posting reviews — we&rsquo;ve sent a
          link to your inbox, or you can verify instantly here.
        </p>
        <a className="btn" href={verifyUrl}>Verify my email &amp; continue</a>
      </div>
    );
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

      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 12 }}>
        {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
      </button>

      <p className="small muted" style={{ marginTop: 14 }}>
        {mode === "login" ? (
          <>No account? <Link href="/signup">Sign up</Link> · <Link href="/forgot">Forgot password?</Link></>
        ) : (
          <>Already registered? <Link href="/login">Log in</Link></>
        )}
      </p>
    </form>
  );
}
