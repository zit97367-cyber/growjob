"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";

type Profile = {
  preferredRoles: string[];
  skills: string[];
  interests: string[];
  preferredLocation?: string;
  remoteOnly?: boolean;
  designation?: string;
};

type Identity = {
  name: string;
  image?: string;
  email?: string;
  phoneNumber?: string;
  designation?: string;
};

type AccountState = {
  email?: string | null;
  role?: "USER" | "ADMIN";
  isPremium?: boolean;
};

const roleOptions = [
  "Solidity Developer",
  "Backend Engineer",
  "Frontend Engineer",
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
  "typescript",
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

function MultiSelectDropdown(props: {
  title: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.options;
    return props.options.filter((item) => item.toLowerCase().includes(q));
  }, [props.options, query]);

  return (
    <div className="rounded-xl border border-emerald-900/10 bg-white/70 p-3">
      <div className="flex items-center justify-between">
        <p className="card-title">{props.title}</p>
        <button className="action-btn" type="button" onClick={() => setOpen((prev) => !prev)}>
          {open ? "Close" : "Select"}
        </button>
      </div>

      {props.selected.length > 0 ? (
        <div className="tag-cloud mt-2">
          {props.selected.map((item) => (
            <button
              key={item}
              type="button"
              className="filter-chip active"
              onClick={() => props.onChange(props.selected.filter((s) => s !== item))}
              title="Remove"
            >
              {item}
            </button>
          ))}
        </div>
      ) : (
        <p className="soft-text mt-2">{props.placeholder}</p>
      )}

      {open ? (
        <div className="mt-3 space-y-2">
          <input
            className="field"
            placeholder={`Search ${props.title.toLowerCase()}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-40 overflow-auto rounded-lg border border-emerald-900/10 bg-white p-2">
            {shown.map((item) => {
              const checked = props.selected.includes(item);
              return (
                <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-[#244d43] hover:bg-emerald-50/70">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      props.onChange(checked ? props.selected.filter((s) => s !== item) : [...props.selected, item]);
                    }}
                  />
                  {item}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NA";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function ProfilePage() {
  const [identity, setIdentity] = useState<Identity>({
    name: "",
    designation: "",
    phoneNumber: "",
  });
  const [creditsBalance, setCreditsBalance] = useState(7);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [message, setMessage] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<AccountState>({});

  useEffect(() => {
    Promise.resolve().then(async () => {
      const profileRes = await fetch("/api/profile", { cache: "no-store" });
      if (!profileRes.ok) return;

      const data = (await profileRes.json()) as {
        profile: Profile | null;
        creditsBalance?: number;
        identity?: Identity;
        account?: AccountState;
      };

      if (data.identity) {
        setIdentity((prev) => ({
          ...prev,
          name: data.identity?.name ?? "",
          image: data.identity?.image,
          email: data.identity?.email,
          phoneNumber: data.identity?.phoneNumber ?? "",
          designation: data.identity?.designation ?? "",
        }));
      }

      if (typeof data.creditsBalance === "number") {
        setCreditsBalance(data.creditsBalance);
      }
      if (data.account) {
        setAccount(data.account);
      }

      if (data.profile) {
        setSelectedRoles(data.profile.preferredRoles ?? []);
        setSelectedSkills(data.profile.skills ?? []);
        setSelectedInterests(data.profile.interests ?? []);
        setLocation(data.profile.preferredLocation ?? "");
        setRemoteOnly(Boolean(data.profile.remoteOnly ?? true));
        if (data.profile.designation) {
          setIdentity((prev) => ({ ...prev, designation: data.profile?.designation ?? "" }));
        }
      }
    });
  }, []);

  async function saveProfile() {
    setSaving(true);
    const trimmedDesignation = identity.designation?.trim() ?? "";
    const nextRoles = trimmedDesignation
      ? [trimmedDesignation, ...selectedRoles.filter((role) => role.toLowerCase() !== trimmedDesignation.toLowerCase())]
      : selectedRoles;

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: identity.name,
        phoneNumber: identity.phoneNumber,
        designation: trimmedDesignation,
        preferredRoles: nextRoles,
        skills: selectedSkills,
        interests: selectedInterests,
        preferredLocation: location,
        remoteOnly,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage(data.error ?? "Profile update failed");
      return;
    }

    setSelectedRoles(nextRoles);
    if (typeof data.creditsBalance === "number") {
      setCreditsBalance(data.creditsBalance);
    }
    if (data.account) {
      setAccount(data.account as AccountState);
    }

    setMessage("Profile updated.");
  }

  async function onAvatarUpload(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Avatar upload failed");
        return;
      }
      setIdentity((prev) => ({ ...prev, image: data.imageUrl }));
      setMessage("Photo uploaded.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <AppShell title="Profile" subtitle="Premium identity dashboard" badge="Profile">
      <section className="section-card animate-rise mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="soft-text">Signed in as {identity.email ?? account.email ?? "Guest"}</p>
          <div className="flex flex-wrap gap-2">
            <span className="ghost-chip">{account.isPremium ? "PREMIUM" : "FREE"}</span>
            <span className="ghost-chip">{account.role ?? "USER"}</span>
          </div>
        </div>
      </section>

      <section className="section-card animate-rise">
        <div className="flex items-start gap-3">
          {identity.image ? (
            <img
              src={identity.image}
              alt="User avatar"
              className="h-14 w-14 rounded-full border border-emerald-900/20 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-900/20 bg-[#0f5a49] text-xl font-bold text-emerald-50">
              {initials(identity.name || "Name")}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <label className="text-xs font-semibold text-[#2a4e46]">Name</label>
            <input
              className="field"
              value={identity.name}
              onChange={(e) => setIdentity((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your name here"
            />

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-[#2a4e46]">Designation</label>
                <input
                  className="field mt-1"
                  value={identity.designation ?? ""}
                  onChange={(e) => setIdentity((prev) => ({ ...prev, designation: e.target.value }))}
                  placeholder="e.g. Product Manager"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#2a4e46]">Phone Number (optional)</label>
                <input
                  className="field mt-1"
                  value={identity.phoneNumber ?? ""}
                  onChange={(e) => setIdentity((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="e.g. +1 555 123 4567"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#2a4e46]">Email ID</label>
              <input className="field mt-1" value={identity.email ?? ""} readOnly />
            </div>

            <label className="action-btn inline-flex cursor-pointer items-center">
              {uploadingAvatar ? "Uploading..." : "Upload Photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onAvatarUpload(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="section-card mt-3 animate-rise delay-1">
        <p className="card-title">Credit Balance</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight text-[#0f3d33]">{creditsBalance}</p>
        <p className="soft-text">Earn credits by completing profile, uploading resume, and running ATS scans.</p>
        <button className="action-btn primary mt-3 w-full" onClick={() => setMessage("Premium flow started")}>Premium Upgrade</button>
      </section>

      <section className="section-card mt-3 animate-rise delay-2 space-y-3">
        <p className="card-title">Career Preferences</p>

        <MultiSelectDropdown
          title="Role Focus"
          placeholder="Select one or more target roles"
          options={roleOptions}
          selected={selectedRoles}
          onChange={setSelectedRoles}
        />

        <MultiSelectDropdown
          title="Skills"
          placeholder="Select your core skills"
          options={skillOptions}
          selected={selectedSkills}
          onChange={setSelectedSkills}
        />

        <MultiSelectDropdown
          title="Interests"
          placeholder="Select your interest areas"
          options={interestOptions}
          selected={selectedInterests}
          onChange={setSelectedInterests}
        />

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
          <div>
            <label className="text-xs font-semibold text-[#2a4e46]">Preferred Location</label>
            <input
              className="field mt-1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Berlin, Remote, Singapore"
            />
          </div>
          <label className="mt-6 flex items-center gap-2 rounded-md border border-emerald-900/20 px-3 py-2 text-xs font-semibold text-[#1f5748]">
            <input checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} type="checkbox" />
            Remote only
          </label>
        </div>
      </section>

      <section className="section-card mt-3 animate-rise delay-2">
        <button className="action-btn primary w-full" onClick={saveProfile} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </section>

      {message ? <p className="toast mt-3">{message}</p> : null}
    </AppShell>
  );
}
