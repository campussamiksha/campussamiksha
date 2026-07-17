import { NextResponse } from "next/server";
import { searchInstitutions } from "@/lib/search";

// GET /api/institutions?q=iit&state=Kerala&type=affiliated_college&sort=rating
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const institutions = await searchInstitutions({
    q: searchParams.get("q") ?? "",
    state: searchParams.get("state") ?? "",
    type: searchParams.get("type") ?? "",
    sort: (searchParams.get("sort") as "reviews" | "rating" | "name") ?? "reviews",
    take: 20,
  });
  return NextResponse.json({ institutions });
}
