import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveFile } from "@/lib/storage";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};
const DOC_TYPES = new Set(["appointment_letter", "payslip", "id_card", "institutional_email"]);

// POST /api/verification (multipart) — upload a proof of employment.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!user.isEmailVerified) {
    return NextResponse.json({ error: "Verify your email first." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });

  const file = form.get("file");
  const docType = String(form.get("docType") ?? "");
  const institutionSlug = form.get("institution") ? String(form.get("institution")) : null;

  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (!DOC_TYPES.has(docType)) return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be between 1 byte and 5 MB." }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Only PDF, PNG or JPG are accepted." }, { status: 400 });

  let institutionId: string | null = null;
  if (institutionSlug) {
    const inst = await prisma.institution.findUnique({ where: { slug: institutionSlug }, select: { id: true } });
    institutionId = inst?.id ?? null;
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const storageRef = await saveFile(`${randomUUID()}.${ext}`, buf);

  await prisma.verificationDocument.create({
    data: {
      userId: user.id,
      institutionId,
      docType,
      storageRef,
      status: "pending",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day retention cap
    },
  });

  return NextResponse.json({ ok: true, status: "pending" }, { status: 201 });
}
