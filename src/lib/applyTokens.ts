import { Prisma } from "@prisma/client";
import {
  CREDITS_PER_BONUS_TOKEN,
  FREE_WEEKLY_LIMIT,
  MAX_BONUS_TOKENS_PER_WEEK,
  PREMIUM_WEEKLY_LIMIT,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getUtcWeekStart } from "@/lib/time";

export type TokenState = {
  weeklyLimit: number;
  bonusTokensBought: number;
  usedTokens: number;
  tokensLeft: number;
  weekStartUtc: Date;
  weekResetAtUtc: Date;
};

export async function getOrCreateQuota(userId: string, now = new Date()) {
  const weekStartUtc = getUtcWeekStart(now);
  const quota = await prisma.applyQuotaWeek.upsert({
    where: {
      userId_weekStartUtc: {
        userId,
        weekStartUtc,
      },
    },
    update: {},
    create: {
      userId,
      weekStartUtc,
      usedTokens: 0,
      bonusTokensBought: 0,
    },
  });
  return quota;
}

export async function getCreditsBalance(userId: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const ledger = await client.creditLedger.aggregate({
    _sum: { amount: true },
    where: { userId },
  });
  return ledger._sum.amount ?? 0;
}

export async function getTokenState(userId: string, isPremium: boolean): Promise<TokenState> {
  const quota = await getOrCreateQuota(userId);
  const weeklyLimit = isPremium ? PREMIUM_WEEKLY_LIMIT : FREE_WEEKLY_LIMIT;
  const hardCap = weeklyLimit + quota.bonusTokensBought;
  const tokensLeft = Math.max(0, hardCap - quota.usedTokens);
  const weekResetAtUtc = new Date(quota.weekStartUtc);
  weekResetAtUtc.setUTCDate(weekResetAtUtc.getUTCDate() + 7);

  return {
    weeklyLimit,
    bonusTokensBought: quota.bonusTokensBought,
    usedTokens: quota.usedTokens,
    tokensLeft,
    weekStartUtc: quota.weekStartUtc,
    weekResetAtUtc,
  };
}

export async function trySpendApplyToken(userId: string, isPremium: boolean) {
  return prisma.$transaction(async (tx) => {
    const weekStartUtc = getUtcWeekStart();
    const quota = await tx.applyQuotaWeek.upsert({
      where: { userId_weekStartUtc: { userId, weekStartUtc } },
      update: {},
      create: { userId, weekStartUtc },
    });

    const weeklyLimit = isPremium ? PREMIUM_WEEKLY_LIMIT : FREE_WEEKLY_LIMIT;
    const maxAllowed = weeklyLimit + quota.bonusTokensBought;
    if (quota.usedTokens >= maxAllowed) {
      return {
        ok: false,
        reason: "quota_exhausted" as const,
        tokensLeft: 0,
      };
    }

    const updated = await tx.applyQuotaWeek.update({
      where: { id: quota.id },
      data: { usedTokens: { increment: 1 } },
    });

    return {
      ok: true,
      tokensLeft: maxAllowed - updated.usedTokens,
    };
  });
}

export async function redeemCreditsForBonusToken(userId: string) {
  return prisma.$transaction(async (tx) => {
    const weekStartUtc = getUtcWeekStart();
    const quota = await tx.applyQuotaWeek.upsert({
      where: { userId_weekStartUtc: { userId, weekStartUtc } },
      update: {},
      create: { userId, weekStartUtc },
    });

    if (quota.bonusTokensBought >= MAX_BONUS_TOKENS_PER_WEEK) {
      return { ok: false as const, reason: "bonus_cap_reached" as const };
    }

    const balance = await getCreditsBalance(userId, tx);
    if (balance < CREDITS_PER_BONUS_TOKEN) {
      return { ok: false as const, reason: "insufficient_credits" as const };
    }

    await tx.creditLedger.create({
      data: {
        userId,
        amount: -CREDITS_PER_BONUS_TOKEN,
        reason: "TOKEN_REDEEM",
      },
    });

    const updated = await tx.applyQuotaWeek.update({
      where: { id: quota.id },
      data: {
        bonusTokensBought: { increment: 1 },
      },
    });

    return {
      ok: true as const,
      bonusTokensBought: updated.bonusTokensBought,
    };
  });
}
