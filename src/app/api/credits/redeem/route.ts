import { NextResponse } from "next/server";
import { redeemCreditsForBonusToken } from "@/lib/applyTokens";
import { getAuthSession } from "@/lib/auth";

export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await redeemCreditsForBonusToken(session.user.id);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
