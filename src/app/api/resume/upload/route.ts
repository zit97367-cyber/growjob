import { NextRequest, NextResponse } from "next/server";
import { awardCredit } from "@/lib/credits";
import { extractTextFromResume } from "@/lib/atsResume";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const text = await extractTextFromResume(file);

  const resume = await prisma.resume.create({
    data: {
      userId: session.user.id,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      content: text.slice(0, 100000),
      storageUrl: null,
    },
  });

  await awardCredit(session.user.id, "RESUME_UPLOAD");

  return NextResponse.json({ resumeId: resume.id });
}
