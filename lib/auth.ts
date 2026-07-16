import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { User } from "@prisma/client";

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
export const SESSION_COOKIE = "cs_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (seconds)

// --- Stateless signed session token (HMAC-SHA256), no session table needed ---

function sign(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function unsign(token: string): Record<string, unknown> | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof payload.exp === "number" && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(userId: string): string {
  return sign({ uid: userId, exp: Date.now() + SESSION_MAX_AGE * 1000 });
}

/** Read the logged-in user from the session cookie (server components + routes). */
export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = unsign(token);
  const uid = payload?.uid;
  if (typeof uid !== "string") return null;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || user.status === "banned") return null;
  return user;
}

/** Returns the user only if they are a moderator/admin, else null. */
export async function requireModerator(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return user.role === "moderator" || user.role === "admin" ? user : null;
}
