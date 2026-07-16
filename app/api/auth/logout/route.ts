import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// POST from a plain <form> (no JS needed); clears the cookie and returns home.
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
