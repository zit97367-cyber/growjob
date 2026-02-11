import { NextResponse } from "next/server";
import { getTokenState } from "@/lib/applyTokens";
import { getAuthSession } from "@/lib/auth";
import { ensureInitialCredits, getCreditsBalance } from "@/lib/credits";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({
      tokenState: {
        weeklyLimit: 7,
        bonusTokensBought: 0,
        usedTokens: 0,
        tokensLeft: 0,
      },
      creditsBalance: 0,
      authenticated: false,
    });
  }

  await ensureInitialCredits(session.user.id);

  const [tokenState, creditsBalance] = await Promise.all([
    getTokenState(session.user.id, session.user.isPremium),
    getCreditsBalance(session.user.id),
  ]);

  return NextResponse.json({
    tokenState,
    creditsBalance,
    authenticated: true,
    isPremium: session.user.isPremium,
  });
}
