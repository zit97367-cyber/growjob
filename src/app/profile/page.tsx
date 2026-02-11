"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";

type Profile = {
  preferredRoles: string[];
  skills: string[];
  interests: string[];
  preferredLocation?: string;
  remoteOnly?: boolean;
};

type Identity = {
  name: string;
  image?: string;
  email?: string;
  designation?: string;
};

const roleOptions = [
  "Solidity Developer",
  "Product Manager",
  "Marketing Lead",
  "Community Manager",
  "Data Analyst",
  "Researcher",
  "Designer",
  "Sales",
];

const skillOptions = [
  "solidity",
  "smart contract",
  "react",
  "node",
  "marketing",
  "copywriting",
  "analytics",
  "seo",
  "community",
  "defi",
  "dao",
  "nft",
];

const interestOptions = [
  "remote",
  "entry level",
  "web3",
  "crypto",
  "growth",
  "research",
  "product",
  "design",
  "sales",
  "customer support",
  "developer relations",
  "data science",
];

export default function ProfilePage() {
  const [identity, setIdentity] = useState<Identity>({
    name: "Web3 Candidate",
    designation: "Web3 Professional",
  });
  const [creditsBalance, setCreditsBalance] = useState(7);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["Solidity Developer"]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["solidity", "react"]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["remote", "web3"]);
  const [location, setLocation] = useState("Remote");
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [message, setMessage] = useState("");

  const avatarUrl = useMemo(() => {
    if (identity.image) return identity.image;
    const seed = encodeURIComponent(identity.name || "GrowJob User");
    return `https://ui-avatars.com/api/?name=${seed}&background=0f5a49&color=ecfff8&size=128`;
  }, [identity.image, identity.name]);

  useEffect(() => {
    Promise.resolve().then(async () => {
      const profileRes = await fetch("/api/profile", { cache: "no-store" });
      if (!profileRes.ok) {
        return;
      }

      const data = (await profileRes.json()) as {
        profile: Profile | null;
        creditsBalance?: number;
        identity?: Identity;
      };

      if (data.identity) {
        setIdentity((prev) => ({
          ...prev,
          name: data.identity?.name ?? prev.name,
          image: data.identity?.image,
          email: data.identity?.email,
          designation: data.identity?.designation ?? prev.designation,
        }));
      }

      if (typeof data.creditsBalance === "number") {
        setCreditsBalance(data.creditsBalance);
      }

      if (data.profile) {
        if (data.profile.preferredRoles.length > 0) setSelectedRoles(data.profile.preferredRoles);
        if (data.profile.skills.length > 0) setSelectedSkills(data.profile.skills);
        if (data.profile.interests.length > 0) setSelectedInterests(data.profile.interests);
        if (data.profile.preferredLocation) setLocation(data.profile.preferredLocation);
        setRemoteOnly(Boolean(data.profile.remoteOnly ?? true));
      }
    });
  }, []);

  function toggleChip(value: string, current: string[], setter: (next: string[]) => void) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function saveProfile() {
    const designation = identity.designation?.trim();
    const nextRoles = designation
      ? [designation, ...selectedRoles.filter((role) => role.toLowerCase() !== designation.toLowerCase())]
      : selectedRoles;

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        preferredRoles: nextRoles,
        skills: selectedSkills,
        interests: selectedInterests,
        preferredLocation: location,
        remoteOnly,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Profile update failed");
      return;
    }

    if (typeof data.creditsBalance === "number") {
      setCreditsBalance(data.creditsBalance);
    }

    setMessage("Profile updated. Matching improved.");
  }

  return (
    <AppShell title="Profile" subtitle="Identity, credits, and career focus" badge="Wallet">
      <section className="section-card animate-rise">
        <div className="flex items-center gap-3">
          <Image
            src={avatarUrl}
            alt="User avatar"
            width={56}
            height={56}
            className="h-14 w-14 rounded-full border border-emerald-900/20 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-[#123c33]">{identity.name}</p>
            <input
              className="field mt-1"
              value={identity.designation ?? ""}
              onChange={(e) => setIdentity((prev) => ({ ...prev, designation: e.target.value }))}
              placeholder="Your designation"
            />
          </div>
        </div>
      </section>

      <section className="section-card mt-3 animate-rise delay-1">
        <p className="card-title">Credit Balance</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight text-[#0f3d33]">{creditsBalance}</p>
        <p className="soft-text">Starts at 7. Earn more by profile completion and ATS scans.</p>
        <button className="action-btn primary mt-3 w-full" onClick={() => setMessage("Premium flow started")}>Premium Upgrade</button>
      </section>

      <section className="section-card mt-3 animate-rise delay-2">
        <p className="card-title">Role Focus</p>
        <div className="tag-cloud mt-3">
          {roleOptions.map((role) => (
            <button key={role} className={`filter-chip ${selectedRoles.includes(role) ? "active" : ""}`} onClick={() => toggleChip(role, selectedRoles, setSelectedRoles)}>
              {role}
            </button>
          ))}
        </div>
      </section>

      <section className="section-card mt-3 animate-rise delay-3">
        <p className="card-title">Skills</p>
        <div className="tag-cloud mt-3">
          {skillOptions.map((skill) => (
            <button key={skill} className={`filter-chip ${selectedSkills.includes(skill) ? "active" : ""}`} onClick={() => toggleChip(skill, selectedSkills, setSelectedSkills)}>
              {skill}
            </button>
          ))}
        </div>
      </section>

      <section className="section-card mt-3 animate-rise delay-4">
        <p className="card-title">Interests</p>
        <div className="tag-cloud mt-3">
          {interestOptions.map((interest) => (
            <button key={interest} className={`filter-chip ${selectedInterests.includes(interest) ? "active" : ""}`} onClick={() => toggleChip(interest, selectedInterests, setSelectedInterests)}>
              {interest}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input className="field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Preferred location" />
          <label className="flex items-center gap-2 rounded-md border border-emerald-900/20 px-3 py-2 text-xs font-semibold text-[#1f5748]">
            <input checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} type="checkbox" />
            Remote
          </label>
        </div>
      </section>

      <section className="section-card mt-3 animate-rise delay-2">
        <button className="action-btn primary w-full" onClick={saveProfile}>Save Profile</button>
      </section>

      {message ? <p className="toast mt-3">{message}</p> : null}
    </AppShell>
  );
}
