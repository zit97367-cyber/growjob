import { UnifiedJob } from "@/lib/ingest/types";

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function stripHtml(input: string | null | undefined) {
  if (!input) return null;
  const noTags = input.replace(/<[^>]*>/g, " ");
  const plain = collapseWhitespace(noTags);
  return plain.length > 0 ? plain : null;
}

export function normalizeText(input: string | null | undefined) {
  if (!input) return null;
  const out = collapseWhitespace(input);
  return out.length > 0 ? out : null;
}

export function isValidHttpUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeJob(job: UnifiedJob): UnifiedJob | null {
  const title = normalizeText(job.title);
  const company = normalizeText(job.company);
  const applyUrl = normalizeText(job.applyUrl);

  if (!title || !company || !applyUrl || !isValidHttpUrl(applyUrl)) {
    return null;
  }

  const location = normalizeText(job.location);
  const description = stripHtml(job.description);

  return {
    ...job,
    title,
    company,
    location,
    description,
    applyUrl,
  };
}
