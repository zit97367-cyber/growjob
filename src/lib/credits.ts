import { CreditReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CREDIT_REWARDS: Record<Exclude<CreditReason, "TOKEN_REDEEM">, number> = {
  PROFILE_COMPLETE: 20,
  RESUME_UPLOAD: 20,
  ATS_SCAN: 10,
  FEEDBACK: 5,
};

const INITIAL_CREDIT_BALANCE = 7;

export async function awardCredit(userId: string, reason: Exclude<CreditReason, "TOKEN_REDEEM">) {
  const amount = CREDIT_REWARDS[reason];
  await prisma.creditLedger.create({
    data: {
      userId,
      amount,
      reason,
    },
  });
}

export async function ensureInitialCredits(userId: string) {
  const existingCount = await prisma.creditLedger.count({ where: { userId } });
  if (existingCount > 0) {
    return;
  }

  await prisma.creditLedger.create({
    data: {
      userId,
      amount: INITIAL_CREDIT_BALANCE,
      reason: "FEEDBACK",
      metadata: { source: "initial_balance" },
    },
  });
}

export async function getCreditsBalance(userId: string) {
  const totals = await prisma.creditLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return totals._sum.amount ?? 0;
}
