import { readFile } from "node:fs/promises";
import path from "node:path";
import { CompanyDirectory } from "@/lib/ingest/types";

const EMPTY: CompanyDirectory = {
  greenhouseBoards: [],
  leverCompanies: [],
};

export async function readCompanyDirectory(): Promise<CompanyDirectory> {
  const filePath = path.join(process.cwd(), "data", "companies.json");
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<CompanyDirectory>;
    return {
      greenhouseBoards: Array.isArray(parsed.greenhouseBoards) ? parsed.greenhouseBoards : [],
      leverCompanies: Array.isArray(parsed.leverCompanies) ? parsed.leverCompanies : [],
    };
  } catch {
    return EMPTY;
  }
}
