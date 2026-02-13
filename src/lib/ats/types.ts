import { AtsType } from "@prisma/client";

export type NormalizedJob = {
  externalId?: string;
  title: string;
  location?: string;
  isRemote: boolean;
  description?: string;
  applyUrl: string;
  publishedAt?: Date;
  sourcePayload: unknown;
  atsType: AtsType;
  sourceType?: "ATS" | "BOARD_API";
  sourceProvider?: string;
  sourceReliability?: number;
};

export type AtsConfig = {
  boardToken?: string;
  handle?: string;
  orgSlug?: string;
  companyIdentifier?: string;
};
