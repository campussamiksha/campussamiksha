import { NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireModerator } from "@/lib/auth";
import { readFile } from "@/lib/storage";

const CONTENT_TYPE: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

// GET /api/verification/:id/file — moderator-only stream of the proof, so it can
// be reviewed. Never public; the file is deleted once a decision is made.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const mod = await requireModerator();
  if (!mod) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await prisma.verificationDocument.findUnique({ where: { id: params.id } });
  if (!doc || !doc.storageRef) {
    return NextResponse.json({ error: "File not available (already purged)." }, { status: 404 });
  }

  try {
    const data = await readFile(doc.storageRef);
    const type = CONTENT_TYPE[path.extname(doc.storageRef).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": type, "Content-Disposition": "inline", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
