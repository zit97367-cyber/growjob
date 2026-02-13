"use client";

import { VerificationStatus } from "@/lib/feedUi";

type Props = {
  status: VerificationStatus;
};

const LABEL: Record<VerificationStatus, string> = {
  SOURCE_VERIFIED: "Source Verified",
  DOMAIN_VERIFIED: "Domain Verified",
  UNVERIFIED: "Unverified",
};

const HELP: Record<VerificationStatus, string> = {
  SOURCE_VERIFIED: "Pulled from ATS/public source directly.",
  DOMAIN_VERIFIED: "Apply URL domain matches trusted company or ATS domain.",
  UNVERIFIED: "Source could not be verified yet.",
};

export function VerifiedBadge({ status }: Props) {
  return (
    <span className={`badge-verify ${status === "UNVERIFIED" ? "muted" : ""}`} title={HELP[status]}>
      {LABEL[status]}
    </span>
  );
}
