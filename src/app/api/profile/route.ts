import { NextRequest, NextResponse } from "next/server";
import { awardCredit, ensureInitialCredits, getCreditsBalance } from "@/lib/credits";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureInitialCredits(session.user.id);

  const [profile, creditsBalance, user] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
    getCreditsBalance(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, image: true, email: true } }),
  ]);

  return NextResponse.json({
    profile,
    creditsBalance,
    identity: {
      name: user?.name ?? "Web3 Candidate",
      image: user?.image,
      email: user?.email,
      designation: profile?.preferredRoles?.[0] ?? "Web3 Professional",
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureInitialCredits(session.user.id);

  const body = await req.json();

  const profile = await prisma.userProfile.upsert({
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

  await awardCredit(session.user.id, "PROFILE_COMPLETE");
  const creditsBalance = await getCreditsBalance(session.user.id);

  return NextResponse.json({
    profile,
    creditsBalance,
    identity: {
      name: session.user.name ?? "Web3 Candidate",
      image: session.user.image,
      designation: profile.preferredRoles?.[0] ?? "Web3 Professional",
    },
  });
}
