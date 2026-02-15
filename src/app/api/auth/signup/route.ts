import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, validatePassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rateLimit";
import { isAdminEmail } from "@/lib/security";

const schema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8).max(200),
});

function getRequestIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const ipBucket = consumeRateLimit(`signup:ip:${ip}`, 20, 60 * 60 * 1000);
  if (!ipBucket.allowed) {
    return NextResponse.json({ error: "Too many signup attempts. Please try again later." }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid signup details." }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid signup details." }, { status: 400 });
  }

  const body = parsed.data;
  const emailBucket = consumeRateLimit(`signup:email:${body.email}`, 5, 30 * 60 * 1000);
  if (!emailBucket.allowed) {
    return NextResponse.json({ error: "Too many signup attempts. Please try again later." }, { status: 429 });
  }

  const pass = validatePassword(body.password);
  if (!pass.ok) {
    return NextResponse.json({ error: pass.error }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "Account already exists. Please sign in." }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);
    const name = body.name?.trim() || body.email.split("@")[0];

    await prisma.user.create({
      data: {
        email: body.email,
        name,
        passwordHash,
        isPremium: false,
        role: isAdminEmail(body.email) ? UserRole.ADMIN : UserRole.USER,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to create account right now. Please try again." }, { status: 500 });
  }
}
