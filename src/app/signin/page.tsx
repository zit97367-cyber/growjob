"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="phone-shell">
      <div className="shell-scroll">
        <section className="hero-card">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">GrowJob Access</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-white">Web3 job hunting, supercharged.</h1>
          <p className="mt-2 text-sm text-emerald-100/80">Modern talent feed, apply tokens, ATS score, and premium workflow.</p>
        </section>

        <section className="section-card mt-4">
          <p className="card-title">Sign In</p>
          <p className="soft-text mt-1">Use Google or email magic link when configured, or demo login fallback.</p>
          <button
            className="action-btn primary mt-4 w-full"
            onClick={() => signIn(undefined, { callbackUrl: "/" })}
          >
            Continue to Dashboard
          </button>
        </section>
      </div>
    </div>
  );
}
