"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";

type Profile = {
  preferredRoles: string[];
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

const roleOptions = ["Engineering", "Marketing", "Design", "Data", "Product", "Sales", "Operations", "Community", "Other"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NA";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function ProfileSection(props: { title: string; subtitle: string; button: string }) {
  return (
    <section className="section-card animate-rise">
      <h3 className="job-title text-[1.05rem]">{props.title}</h3>
      <p className="soft-text mt-1">{props.subtitle}</p>
      <div className="mt-3 rounded-xl bg-[#f2f4f7] p-5">
        <button className="action-btn primary w-full">{props.button}</button>
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const [identity, setIdentity] = useState<Identity>({ name: "", designation: "", phoneNumber: "" });
  const [creditsBalance, setCreditsBalance] = useState(7);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [message, setMessage] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.resolve().then(async () => {
      const profileRes = await fetch("/api/profile", { cache: "no-store" });
      if (!profileRes.ok) return;
      const data = (await profileRes.json()) as {
        profile: Profile | null;
        creditsBalance?: number;
        identity?: Identity;
      };

      if (data.identity) {
        setIdentity({
          name: data.identity.name ?? "",
          image: data.identity.image,
          email: data.identity.email,
          phoneNumber: data.identity.phoneNumber ?? "",
          designation: data.identity.designation ?? "",
        });
      }

      if (typeof data.creditsBalance === "number") setCreditsBalance(data.creditsBalance);
      if (data.profile) {
        setSelectedRoles(data.profile.preferredRoles ?? []);
        setLocation(data.profile.preferredLocation ?? "");
        setRemoteOnly(Boolean(data.profile.remoteOnly ?? true));
      }
    });
  }, []);

  async function saveProfile() {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: identity.name,
        phoneNumber: identity.phoneNumber,
        designation: identity.designation,
        preferredRoles: selectedRoles,
        preferredLocation: location,
        remoteOnly,
        skills: [],
        interests: [],
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error ?? "Profile update failed");
      return;
    }
    if (typeof data.creditsBalance === "number") setCreditsBalance(data.creditsBalance);
    setMessage("Profile saved");
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
    <AppShell title="Profile" subtitle="Build your profile once and apply faster">
      <section className="section-card animate-rise">
        <div className="flex items-start gap-3">
          {identity.image ? (
            <img src={identity.image} alt="User avatar" className="h-14 w-14 rounded-full border border-emerald-900/20 object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-900/20 bg-[#0f5a49] text-xl font-bold text-emerald-50">
              {initials(identity.name || "Name")}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <input
              className="field"
              value={identity.name}
              onChange={(e) => setIdentity((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your name here"
            />
            <input
              className="field"
              value={identity.designation ?? ""}
              onChange={(e) => setIdentity((prev) => ({ ...prev, designation: e.target.value }))}
              placeholder="Designation (optional)"
            />
            <input
              className="field"
              value={identity.phoneNumber ?? ""}
              onChange={(e) => setIdentity((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="Phone number (optional)"
            />
            <input className="field" value={identity.email ?? ""} readOnly />
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
        <button className="action-btn mt-3 w-full" onClick={() => (window.location.href = "/plans")}>
          Upgrade to Premium
        </button>
      </section>

      <section className="section-card mt-3 animate-rise delay-1">
        <p className="card-title">Job Preferences</p>
        <div className="mt-2 grid grid-cols-1 gap-2">
          <select
            multiple
            className="field min-h-24"
            value={selectedRoles}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions).map((option) => option.value);
              setSelectedRoles(values);
            }}
          >
            {roleOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            className="field"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Preferred location"
          />
          <label className="flex items-center gap-2 text-xs font-semibold text-[#1f5748]">
            <input checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} type="checkbox" />
            Remote only
          </label>
        </div>
        <button className="action-btn primary mt-3 w-full" onClick={saveProfile} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </section>

      <div className="mt-3 space-y-3">
        <ProfileSection title="Resume" subtitle="Private" button="Upload resume" />
        <ProfileSection title="About" subtitle="Add your personal summary and contact details." button="Add personal details" />
        <ProfileSection title="Experience" subtitle="Show your past roles and project impact." button="Add experience" />
        <ProfileSection title="Education" subtitle="Add your academic background and certifications." button="Add education" />
        <ProfileSection title="Interests" subtitle="Tell recruiters what roles excite you." button="Add interests" />
      </div>

      {message ? <p className="toast mt-3">{message}</p> : null}
    </AppShell>
  );
}
