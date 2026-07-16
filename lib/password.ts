import bcrypt from "bcryptjs";

// Kept dependency-light (bcryptjs only) so both the Next.js runtime and the
// standalone seed script can hash/verify without importing `next/headers`.
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
