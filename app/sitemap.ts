import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BASE = process.env.APP_URL || "https://campussamiksha.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A sitemap file allows max 50,000 URLs — cap at the 45k most useful
  // (reviewed / most-linked first). The long tail is still reachable via search
  // and internal links; a paginated sitemap index can extend this later.
  const insts = await prisma.institution.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: [{ reviewCount: "desc" }, { nirfRankOverall: "asc" }],
    take: 45000,
  });

  const staticPages: MetadataRoute.Sitemap = ["", "/guide", "/login", "/signup"].map((p) => ({
    url: BASE + (p || "/"),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.5,
  }));

  const instPages: MetadataRoute.Sitemap = insts.map((i) => ({
    url: `${BASE}/institutions/${i.slug}`,
    lastModified: i.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...instPages];
}
