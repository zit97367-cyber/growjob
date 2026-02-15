"use client";

type Props = {
  label: "Missing" | "Partial" | "Complete";
};

export function StatusPill({ label }: Props) {
  return <span className={`status-pill ${label.toLowerCase()}`}>{label}</span>;
}
