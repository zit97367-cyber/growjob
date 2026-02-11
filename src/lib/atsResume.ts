import mammoth from "mammoth";

export async function extractTextFromResume(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());

  if (file.type.includes("pdf")) {
    return bytes.toString("utf8").replace(/[^\x20-\x7E\n\r\t]/g, " ").slice(0, 100000);
  }

  if (file.type.includes("word") || file.name.endsWith(".docx")) {
    const parsed = await mammoth.extractRawText({ buffer: bytes });
    return parsed.value;
  }

  return bytes.toString("utf8");
}

export function runMockAtsScan(params: {
  resumeText: string;
  targetRoles: string[];
  jobDescription?: string;
}) {
  const corpus = `${params.resumeText} ${params.jobDescription ?? ""}`.toLowerCase();
  const roleKeywords = params.targetRoles.flatMap((r) => r.toLowerCase().split(/\s+/));
  const keywords = [
    ...new Set([
      ...roleKeywords,
      "solidity",
      "typescript",
      "smart contract",
      "defi",
      "react",
      "security",
      "protocol",
      "node",
    ]),
  ].filter((k) => k.length > 2);

  const found = keywords.filter((k) => corpus.includes(k));
  const missing = keywords.filter((k) => !corpus.includes(k)).slice(0, 8);

  const score = Math.max(30, Math.min(100, 45 + found.length * 6 - missing.length * 2));

  const improvements = [
    "Add quantified outcomes for your last 2 roles",
    "Move Web3-specific projects above generic experience",
    "Mirror exact keywords from the target role",
    "Tighten summary to 3 lines with protocol impact",
    "Highlight security review and audit collaboration",
  ];

  return {
    score,
    improvements: improvements.slice(0, 5),
    missingKeywords: missing.slice(0, 5),
    tailoredOutput: "Premium feature: Tailor resume to this job (stub).",
  };
}
