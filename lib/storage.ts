import { promises as fs } from "fs";
import path from "path";

// Private storage for verification proofs. This directory is NOT web-served and
// is gitignored. In production, use object storage (S3/GCS) with a lifecycle
// rule that hard-deletes objects — the DB only ever holds a reference, never
// the document, and the reference is nulled once the proof is reviewed/expired.
const DIR = process.env.VERIFICATION_UPLOAD_DIR || path.join(process.cwd(), "private-uploads");

// Guard against path traversal — callers only ever pass a generated basename.
function resolveSafe(name: string): string {
  const base = path.basename(name);
  return path.join(DIR, base);
}

export async function saveFile(name: string, data: Buffer): Promise<string> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(resolveSafe(name), data);
  return path.basename(name);
}

export async function readFile(name: string): Promise<Buffer> {
  return fs.readFile(resolveSafe(name));
}

export async function deleteFile(name: string): Promise<void> {
  try {
    await fs.unlink(resolveSafe(name));
  } catch {
    // Already gone — purge is idempotent.
  }
}
