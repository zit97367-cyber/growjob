import { Job, UserProfile, VerificationTier } from "@prisma/client";

type MatchResult = {
  score: number;
  reason: string;
};

export function computeMatch(profile: UserProfile | null, job: Job): MatchResult {
  if (!profile) {
    return { score: 10, reason: "Complete your profile for personalized matching" };
  }

  const skillHits = profile.skills.filter((skill) =>
    `${job.title} ${job.description ?? ""}`.toLowerCase().includes(skill.toLowerCase()),
  ).length;

  const roleHit = profile.preferredRoles.some((role) =>
    job.title.toLowerCase().includes(role.toLowerCase()),
  );

  const remoteFit = profile.remoteOnly ? job.isRemote : true;

  let score = 0;
  score += skillHits * 18;
  score += roleHit ? 20 : 0;
  score += remoteFit ? 12 : -10;
  score += job.verificationTier === VerificationTier.SOURCE_VERIFIED ? 8 : 0;

  const parts = [];
  parts.push(`${skillHits} skill matches`);
  if (roleHit) parts.push("role fit");
  if (remoteFit) parts.push("remote fit");

  return {
    score: Math.max(0, Math.min(100, score)),
    reason: parts.slice(0, 2).join(" + ") || "Fresh opportunity",
  };
}

export function sortFeed<T extends { matchScore: number; freshnessRank: number; verificationRank: number; sourceReliability?: number }>(items: T[]) {
  return [...items].sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.freshnessRank !== a.freshnessRank) return b.freshnessRank - a.freshnessRank;
    if ((b.sourceReliability ?? 0) !== (a.sourceReliability ?? 0)) {
      return (b.sourceReliability ?? 0) - (a.sourceReliability ?? 0);
    }
    return b.verificationRank - a.verificationRank;
  });
}
