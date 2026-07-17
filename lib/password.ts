import bcrypt from "bcryptjs";
import crypto from "crypto";

// Short digest of a password hash. Embedding it in a reset token makes the link
// single-use: after the password changes, the digest no longer matches.
export function pwCheck(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

// Kept dependency-light (bcryptjs only) so both the Next.js runtime and the
// standalone seed script can hash/verify without importing `next/headers`.
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
