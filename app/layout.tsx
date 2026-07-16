import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import { getCurrentUser } from "@/lib/auth";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans", display: "swap" });
const serif = IBM_Plex_Serif({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-serif", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const dynamic = "force-dynamic";

const LAUNCH_YEAR = 2026;

export const metadata: Metadata = {
  title: {
    default: "CampusSamiksha — Honest reviews of Indian academic employers",
    template: "%s · CampusSamiksha",
  },
  description:
    "Anonymous, verified reviews of Indian universities, colleges and research institutes by faculty, non-teaching staff and research scholars.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isMod = user?.role === "moderator" || user?.role === "admin";

  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              Campus<b>Samiksha</b> <span className="deva">समीक्षा</span>
            </Link>
            <nav className="nav">
              <Link href="/guide">Guide</Link>
              {isMod ? <Link href="/admin">Moderation</Link> : null}
              {user ? (
                <>
                  {user.maxBadge !== "employment_verified" ? <Link href="/verify">Get verified</Link> : null}
                  <span className="muted small">{user.displayHandle || user.email}</span>
                  <form action="/api/auth/logout" method="post">
                    <button type="submit" className="linkbtn">Log out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login">Log in</Link>
                  <Link href="/signup" className="btn" style={{ padding: "8px 16px" }}>Sign up</Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="container" style={{ padding: "26px 22px 40px" }}>{children}</main>

        <footer className="site-footer">
          <div className="container">
            <span className="fbrand">CampusSamiksha</span>
            <span className="muted">© {LAUNCH_YEAR}</span>
            <Link href="/guide">Guide</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/guidelines">Content Guidelines</Link>
            <Link href="/grievance">Grievance &amp; Takedown</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
