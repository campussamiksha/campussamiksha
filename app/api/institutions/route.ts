import { NextResponse } from "next/server";
import { searchInstitutions } from "@/lib/search";

// GET /api/institutions?q=iit  — typeahead / search (also matches acronyms/aka)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const institutions = await searchInstitutions(q, 20);
  return NextResponse.json({ institutions });
}
