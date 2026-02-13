import { del, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function sanitize(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/-+/g, "-").slice(0, 64);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob storage not configured" }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${Date.now()}-${sanitize(file.name || "avatar")}.${ext}`;
  const path = `avatars/${session.user.id}/${fileName}`;

  const previous = await prisma.user.findUnique({ where: { id: session.user.id }, select: { image: true } });
  const upload = await put(path, file, { access: "public", token: process.env.BLOB_READ_WRITE_TOKEN });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: upload.url },
  });

  if (previous?.image?.includes("public.blob.vercel-storage.com")) {
    await del(previous.image, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, imageUrl: upload.url });
}
