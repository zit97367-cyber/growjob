import { NextRequest, NextResponse } from "next/server";
import { awardCredit, ensureInitialCredits, getCreditsBalance } from "@/lib/credits";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureInitialCredits(session.user.id);

  let profile: {
    preferredRoles?: string[];
    designation?: string | null;
  } | null = null;
  let user: {
    name: string | null;
    image: string | null;
    email: string | null;
    phoneNumber?: string | null;
  } | null = null;

  try {
    [profile, user] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, image: true, email: true, phoneNumber: true },
      }),
    ]);
  } catch {
    [profile, user] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, image: true, email: true },
      }),
    ]);
  }

  const creditsBalance = await getCreditsBalance(session.user.id);

  return NextResponse.json({
    profile,
    creditsBalance,
    identity: {
      name: user?.name ?? "",
      image: user?.image,
      email: user?.email,
      phoneNumber: user?.phoneNumber ?? "",
      designation: profile?.designation ?? "",
    },
    account: {
      email: user?.email ?? session.user.email ?? null,
      role: session.user.role,
      isPremium: session.user.isPremium,
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureInitialCredits(session.user.id);

  const body = await req.json();

  const trimmedName = typeof body.name === "string" ? body.name.trim().slice(0, 120) : undefined;
  const trimmedPhone = typeof body.phoneNumber === "string" ? body.phoneNumber.trim().slice(0, 40) : "";
  const trimmedDesignation = typeof body.designation === "string" ? body.designation.trim().slice(0, 120) : "";

  let profile:
    | {
        preferredRoles?: string[];
        designation?: string | null;
      }
    | null = null;

  try {
    profile = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: trimmedName,
          phoneNumber: trimmedPhone || null,
        },
      });

      return tx.userProfile.upsert({
        where: { userId: session.user.id },
        update: {
          preferredRoles: body.preferredRoles ?? [],
          salaryMin: body.salaryMin,
          salaryMax: body.salaryMax,
          preferredLocation: body.preferredLocation,
          designation: trimmedDesignation || null,
          remoteOnly: Boolean(body.remoteOnly),
          skills: body.skills ?? [],
          interests: body.interests ?? [],
        },
        create: {
          userId: session.user.id,
          preferredRoles: body.preferredRoles ?? [],
          salaryMin: body.salaryMin,
          salaryMax: body.salaryMax,
          preferredLocation: body.preferredLocation,
          designation: trimmedDesignation || null,
          remoteOnly: Boolean(body.remoteOnly),
          skills: body.skills ?? [],
          interests: body.interests ?? [],
        },
      });
    });
  } catch {
    profile = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: trimmedName,
        },
      });

      return tx.userProfile.upsert({
        where: { userId: session.user.id },
        update: {
          preferredRoles: body.preferredRoles ?? [],
          salaryMin: body.salaryMin,
          salaryMax: body.salaryMax,
          preferredLocation: body.preferredLocation,
          remoteOnly: Boolean(body.remoteOnly),
          skills: body.skills ?? [],
          interests: body.interests ?? [],
        },
        create: {
          userId: session.user.id,
          preferredRoles: body.preferredRoles ?? [],
          salaryMin: body.salaryMin,
          salaryMax: body.salaryMax,
          preferredLocation: body.preferredLocation,
          remoteOnly: Boolean(body.remoteOnly),
          skills: body.skills ?? [],
          interests: body.interests ?? [],
        },
      });
    });
  }

  await awardCredit(session.user.id, "PROFILE_COMPLETE");
  const creditsBalance = await getCreditsBalance(session.user.id);

  return NextResponse.json({
    profile,
    creditsBalance,
    identity: {
      name: typeof body.name === "string" ? body.name.trim() : (session.user.name ?? ""),
      image: session.user.image,
      email: session.user.email,
      phoneNumber: trimmedPhone,
      designation: profile.designation ?? "",
    },
    account: {
      email: session.user.email ?? null,
      role: session.user.role,
      isPremium: session.user.isPremium,
    },
  });
}
