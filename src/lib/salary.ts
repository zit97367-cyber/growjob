export type ParsedSalary = {
  salaryMinUsd: number | null;
  salaryMaxUsd: number | null;
  salaryInferred: boolean;
};

const CURRENCY_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.1,
  GBP: 1.27,
};

function toUsd(amount: number, currency: string) {
  const rate = CURRENCY_TO_USD[currency] ?? 1;
  return Math.round(amount * rate);
}

function normalizeMoney(raw: string): number {
  const cleaned = raw.replace(/[$€£,\s]/g, "").toLowerCase();
  if (cleaned.endsWith("k")) {
    return Number(cleaned.slice(0, -1)) * 1000;
  }
  return Number(cleaned);
}

function detectCurrency(text: string): string {
  if (/€|\beur\b/i.test(text)) return "EUR";
  if (/£|\bgbp\b/i.test(text)) return "GBP";
  return "USD";
}

export function parseSalaryToUsd(text: string): ParsedSalary {
  const content = text ?? "";
  const currency = detectCurrency(content);

  const rangeMatch = content.match(/([$€£]?\s?\d[\d,.]*k?)\s*(?:-|to|–)\s*([$€£]?\s?\d[\d,.]*k?)/i);
  if (rangeMatch) {
    const min = normalizeMoney(rangeMatch[1]);
    const max = normalizeMoney(rangeMatch[2]);
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) {
      return {
        salaryMinUsd: toUsd(min, currency),
        salaryMaxUsd: toUsd(max, currency),
        salaryInferred: false,
      };
    }
  }

  const singleMatch = content.match(/([$€£]?\s?\d[\d,.]*k?)/i);
  if (singleMatch) {
    const amount = normalizeMoney(singleMatch[1]);
    if (Number.isFinite(amount) && amount > 0) {
      return {
        salaryMinUsd: toUsd(amount, currency),
        salaryMaxUsd: null,
        salaryInferred: false,
      };
    }
  }

  return {
    salaryMinUsd: 10000,
    salaryMaxUsd: null,
    salaryInferred: true,
  };
}

export function salaryLabel(min: number | null | undefined, max: number | null | undefined, inferred: boolean) {
  if (!min && !max) return "Salary not listed";
  if (min && max) {
    return `$${Math.round(min / 1000)}k-$${Math.round(max / 1000)}k${inferred ? " (Estimated)" : ""}`;
  }
  if (min) {
    return `$${Math.round(min / 1000)}k+${inferred ? " (Estimated)" : ""}`;
  }
  return `$${Math.round((max ?? 0) / 1000)}k${inferred ? " (Estimated)" : ""}`;
}
