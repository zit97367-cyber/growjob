import { NextResponse } from "next/server";
import { getTokenState } from "@/lib/applyTokens";
import { getAuthSession } from "@/lib/auth";
import { ensureInitialCredits, getCreditsBalance } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({
      tokenState: {
        weeklyLimit: 7,
        bonusTokensBought: 0,
        usedTokens: 0,
        tokensLeft: 7,
      },
      creditsBalance: 0,
      authenticated: false,
      hasResume: false,
      user: null,
    });
  }

  await ensureInitialCredits(session.user.id);

  const [tokenState, creditsBalance, resume] = await Promise.all([
    getTokenState(session.user.id, session.user.isPremium),
    getCreditsBalance(session.user.id),
    prisma.resume.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    }),
  ]);

  return NextResponse.json({
    tokenState,
    creditsBalance,
    authenticated: true,
    isPremium: session.user.isPremium,
    hasResume: Boolean(resume),
    user: {
      email: session.user.email ?? null,
      role: session.user.role,
      isPremium: session.user.isPremium,
    },
  });
}
