export type JobSource = "GREENHOUSE" | "LEVER" | "REMOTIVE";

export type UnifiedJob = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean | null;
  description: string | null;
  applyUrl: string;
  postedAt: string | null;
  firstSeenAt: string;
  source: JobSource;
  sourceName?: string;
  sourceUrl?: string;
  websiteDomain?: string;
};

export type GreenhouseDirectoryCompany = {
  name: string;
  boardToken: string;
  websiteDomain: string;
};

export type LeverDirectoryCompany = {
  name: string;
  companySlug: string;
  websiteDomain: string;
};

export type CompanyDirectory = {
  greenhouseBoards: GreenhouseDirectoryCompany[];
  leverCompanies: LeverDirectoryCompany[];
};

export type JobsCache = {
  generatedAt: string;
  jobs: UnifiedJob[];
};

export type IngestStats = {
  generatedAt: string;
  jobsSeen: number;
  jobsKept: number;
  jobsDeduped: number;
  sourceBreakdown: Array<{
    source: JobSource;
    seen: number;
    kept: number;
  }>;
};
