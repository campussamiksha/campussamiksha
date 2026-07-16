/**
 * Storage-layer test — no database needed. Verifies save/read/delete, purge
 * idempotency, and the path-traversal guard in lib/storage.
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/storage-test.ts
 */
import { promises as fs } from "fs";
import path from "path";
import { saveFile, readFile, deleteFile } from "../lib/storage";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}` + (extra !== undefined ? `  (${JSON.stringify(extra)})` : "")); }
}

async function main() {
  const dir = process.env.VERIFICATION_UPLOAD_DIR!;
  const payload = Buffer.from("proof-document-bytes-");

  const ref = await saveFile("abc123.pdf", payload);
  check("saveFile returns basename", ref === "abc123.pdf", ref);
  check("file exists on disk", await fs.stat(path.join(dir, ref)).then(() => true).catch(() => false));

  const back = await readFile(ref);
  check("readFile round-trips bytes", Buffer.compare(back, payload) === 0);

  // Path traversal: a malicious name must resolve to a basename inside DIR only.
  const evil = await saveFile("../../../etc/evil.png", Buffer.from("x"));
  check("traversal stripped to basename", evil === "evil.png", evil);
  const escaped = path.join(dir, "..", "..", "..", "etc", "evil.png");
  check("no file written outside dir", !(await fs.stat(escaped).then(() => true).catch(() => false)));

  await deleteFile(ref);
  check("deleteFile removes file", !(await fs.stat(path.join(dir, ref)).then(() => true).catch(() => false)));
  let threw = false;
  try { await deleteFile(ref); } catch { threw = true; }
  check("deleteFile is idempotent (no throw when absent)", !threw);

  await deleteFile("evil.png");
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
