"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ActionImpactCard } from "@/components/common/ActionImpactCard";
import { OutcomeMeter } from "@/components/common/OutcomeMeter";

export default function GrowthPage() {
  const [usedTokens, setUsedTokens] = useState(0);
  const [weeklyLimit, setWeeklyLimit] = useState(7);
  const [hasResume, setHasResume] = useState(false);
  const [profileStrength, setProfileStrength] = useState(35);

  useEffect(() => {
    void (async () => {
      const [tokenRes, profileRes] = await Promise.all([
        fetch("/api/me/token-state", { cache: "no-store" }),
        fetch("/api/profile", { cache: "no-store" }),
      ]);

      if (tokenRes.ok) {
        const tokenData = (await tokenRes.json()) as {
          tokenState?: { usedTokens: number; weeklyLimit: number; bonusTokensBought: number };
          hasResume?: boolean;
        };
        setUsedTokens(tokenData.tokenState?.usedTokens ?? 0);
        const baseLimit = tokenData.tokenState?.weeklyLimit ?? 7;
        const bonus = tokenData.tokenState?.bonusTokensBought ?? 0;
        setWeeklyLimit(baseLimit + bonus);
        setHasResume(Boolean(tokenData.hasResume));
      }

      if (profileRes.ok) {
        const profileData = (await profileRes.json()) as {
          identity?: { name?: string; designation?: string; image?: string; phoneNumber?: string };
          profile?: { preferredRoles?: string[]; preferredLocation?: string };
        };
        let score = 20;
        if (profileData.identity?.name) score += 16;
        if (profileData.identity?.designation) score += 12;
        if (profileData.identity?.image) score += 8;
        if (profileData.identity?.phoneNumber) score += 6;
        if (profileData.profile?.preferredRoles && profileData.profile.preferredRoles.length > 0) score += 12;
        if (profileData.profile?.preferredLocation) score += 8;
        if (hasResume) score += 18;
        setProfileStrength(Math.min(100, score));
      }
    })();
  }, [hasResume]);

  const safeApplyRate = useMemo(() => {
    if (usedTokens === 0) return 100;
    return Math.max(70, 100 - Math.min(20, Math.floor(usedTokens * 1.5)));
  }, [usedTokens]);

  const averageMatch = useMemo(() => {
    const baseline = hasResume ? 72 : 58;
    return Math.min(92, baseline + Math.floor(profileStrength / 10));
  }, [hasResume, profileStrength]);

  const outcomeScore = useMemo(() => {
    const tokenMomentum = Math.max(0, Math.min(25, (weeklyLimit - usedTokens) * 4));
    return Math.min(100, Math.floor(profileStrength * 0.45 + averageMatch * 0.4 + tokenMomentum * 0.15));
  }, [averageMatch, profileStrength, usedTokens, weeklyLimit]);

  return (
    <AppShell title="Growth" subtitle="Weekly Outcome Plan and hiring progress">
      <OutcomeMeter
        score={outcomeScore}
        title="Weekly Outcome Plan"
        subtitle="Target applications, safe apply quality, and match improvement trend."
        nextAction={hasResume ? "Run Check Match % on top 2 jobs." : "Upload resume to improve average match quality."}
      />

      <section className="section-card mt-3 animate-rise delay-1">
        <p className="card-title">Application Quality</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#f2f6f4] p-3">
            <p className="text-[0.62rem] uppercase tracking-[0.08em] text-[#5f7d75]">Applied</p>
            <p className="text-lg font-semibold text-[#1a463c]">{usedTokens}</p>
          </div>
          <div className="rounded-xl bg-[#f2f6f4] p-3">
            <p className="text-[0.62rem] uppercase tracking-[0.08em] text-[#5f7d75]">Safe Apply</p>
            <p className="text-lg font-semibold text-[#1a463c]">{safeApplyRate}%</p>
          </div>
          <div className="rounded-xl bg-[#f2f6f4] p-3">
            <p className="text-[0.62rem] uppercase tracking-[0.08em] text-[#5f7d75]">Avg Match</p>
            <p className="text-lg font-semibold text-[#1a463c]">{averageMatch}%</p>
          </div>
        </div>
      </section>

      <div className="mt-3 space-y-3">
        <ActionImpactCard
          title="Next Best Action"
          body="Fix 2 role-specific resume gaps and improve interview likelihood this week."
          impact="+12%"
          ctaLabel="Open AI Matches"
          onClick={() => (window.location.href = "/")}
        />
        <ActionImpactCard
          title="Profile Completion Momentum"
          body="Complete missing profile modules to improve recruiter confidence."
          impact="+9%"
          ctaLabel="Open Profile"
          onClick={() => (window.location.href = "/profile")}
        />
        <ActionImpactCard
          title="Progress Streak"
          body={`${Math.max(1, 7 - usedTokens)} actions left to hit your weekly target of ${weeklyLimit} applications.`}
          impact="Weekly goal"
        />
      </div>
    </AppShell>
  );
}
