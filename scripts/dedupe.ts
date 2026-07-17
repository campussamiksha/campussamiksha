/**
 * Remove AICTE↔AISHE near-duplicates: where the same institution was imported
 * from both AICTE (rich: ownership/type) and AISHE (name/state), keep the AICTE
 * entry and delete the AISHE copy. Only touches clean 1-AICTE + 1-AISHE pairs
 * that share a normalized name + state, so distinct colleges are never merged.
 *   DATABASE_URL=... npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/dedupe.ts [--write]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const AICTE = /^\d+-\d+$/;
const AISHE = /^[CUSR]-\d+$/;

const norm = (s: string | null) => (s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
function source(aka: string[]): "aicte" | "aishe" | "other" {
  if (aka.some((a) => AICTE.test(a))) return "aicte";
  if (aka.some((a) => AISHE.test(a))) return "aishe";
  return "other";
}

async function main() {
  const write = process.argv.includes("--write");
  const all = await prisma.institution.findMany({ select: { id: true, name: true, state: true, aka: true } });
  console.log(`Scanning ${all.length} institutions…`);

  const groups = new Map<string, typeof all>();
  for (const i of all) {
    const k = `${norm(i.name)}|${norm(i.state)}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(i);
  }

  const deleteIds: string[] = [];
  for (const g of groups.values()) {
    if (g.length !== 2) continue; // only clean pairs — never touch bigger/ambiguous groups
    const srcs = g.map((x) => source(x.aka));
    const aicteN = srcs.filter((s) => s === "aicte").length;
    const aisheN = srcs.filter((s) => s === "aishe").length;
    if (aicteN === 1 && aisheN === 1) {
      deleteIds.push(g[srcs.indexOf("aishe")].id); // drop the AISHE copy, keep the richer AICTE one
    }
  }

  console.log(`Duplicate AISHE copies to remove: ${deleteIds.length}`);
  if (!write) { console.log("Dry run — pass --write to delete."); await prisma.$disconnect(); return; }

  let deleted = 0;
  for (let i = 0; i < deleteIds.length; i += 1000) {
    const res = await prisma.institution.deleteMany({ where: { id: { in: deleteIds.slice(i, i + 1000) } } });
    deleted += res.count;
    process.stdout.write(`  ${Math.min(i + 1000, deleteIds.length)}/${deleteIds.length}\r`);
  }
  console.log(`\nRemoved ${deleted} duplicates.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
