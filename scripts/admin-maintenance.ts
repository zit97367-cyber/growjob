import { UserRole } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { getUtcWeekStart } from "../src/lib/time";

function arg(name: string) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const email = (arg("--email") ?? process.env.ADMIN_TARGET_EMAIL ?? "").toLowerCase().trim();
  if (!email) {
    throw new Error("Provide --email user@example.com or set ADMIN_TARGET_EMAIL");
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } });
  if (!user) {
    throw new Error(`User not found for email: ${email}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { role: UserRole.ADMIN } });

    const weekStartUtc = getUtcWeekStart();
    await tx.applyQuotaWeek.upsert({
      where: { userId_weekStartUtc: { userId: user.id, weekStartUtc } },
      update: { usedTokens: 0 },
      create: {
        userId: user.id,
        weekStartUtc,
        usedTokens: 0,
        bonusTokensBought: 0,
      },
    });
  });

  console.log(`Updated ${email}: role=ADMIN and current-week usedTokens reset to 0.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
