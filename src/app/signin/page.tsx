"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

const REQUEST_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => window.clearTimeout(timer));
  });
}

async function safeJson(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function SignInPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    setLoading(true);
    setError("");
    try {
      const result = await withTimeout(
        signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
          callbackUrl: "/jobs",
        }),
      );

      if (!result?.ok) {
        setError("Invalid email or password.");
        return;
      }

      window.location.href = result.url ?? "/jobs";
    } catch (err) {
      const msg = err instanceof Error && err.message === "timeout"
        ? "Login is taking longer than expected. Try again."
        : "Unable to sign in right now. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    setLoading(true);
    setError("");
    try {
      const res = await withTimeout(fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      }));
      const data = await safeJson(res);
      if (!res.ok) {
        setError((data as { error?: string } | null)?.error ?? "Unable to create account.");
        return;
      }

      const result = await withTimeout(
        signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
          callbackUrl: "/jobs",
        }),
      );
      if (!result?.ok) {
        setError("Account created. Please sign in.");
        return;
      }
      window.location.href = result.url ?? "/jobs";
    } catch (err) {
      const msg = err instanceof Error && err.message === "timeout"
        ? "Login is taking longer than expected. Try again."
        : "Unable to create account right now. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="phone-shell">
      <div className="shell-scroll">
        <section className="hero-card">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">GrowJob Access</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-white">Web3 job hunting, supercharged.</h1>
          <p className="mt-2 text-sm text-emerald-100/80">Modern talent feed, apply tokens, ATS score, and premium workflow.</p>
        </section>

        <section className="section-card mt-4">
          <div className="mb-3 inline-flex rounded-lg border border-emerald-900/15 bg-white/70 p-1">
            <button
              className={`action-btn ${tab === "signin" ? "primary" : ""}`}
              type="button"
              onClick={() => {
                setTab("signin");
                setError("");
              }}
            >
              Sign In
            </button>
            <button
              className={`action-btn ${tab === "signup" ? "primary" : ""}`}
              type="button"
              onClick={() => {
                setTab("signup");
                setError("");
              }}
            >
              Sign Up
            </button>
          </div>

          <p className="card-title">{tab === "signin" ? "Welcome back" : "Create account"}</p>
          <p className="soft-text mt-1">
            {tab === "signin"
              ? "Sign in with your email and password."
              : "Create your GrowJob account to track premium status and applications."}
          </p>

          <div className="mt-4 space-y-3">
            {tab === "signup" ? (
              <input
                className="field"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : null}
            <input
              className="field"
              placeholder="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="field"
              placeholder="Password"
              type="password"
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? <p className="mt-3 text-xs font-medium text-red-700">{error}</p> : null}

          <button
            className="action-btn primary mt-4 w-full"
            type="button"
            onClick={() => (tab === "signin" ? void handleSignIn() : void handleSignUp())}
            disabled={loading}
          >
            {loading ? "Please wait..." : tab === "signin" ? "Sign In" : "Create Account"}
          </button>
        </section>
      </div>
    </div>
  );
}
