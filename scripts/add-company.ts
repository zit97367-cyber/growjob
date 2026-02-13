import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Directory = {
  greenhouseBoards: Array<{ name: string; boardToken: string; websiteDomain: string }>;
  leverCompanies: Array<{ name: string; companySlug: string; websiteDomain: string }>;
};

function parseFlag(flag: string) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const source = parseFlag("--source");
  const name = parseFlag("--name");
  const domain = parseFlag("--domain");
  const token = parseFlag("--token");
  const slug = parseFlag("--slug");

  if (!source || !name || !domain || (source === "greenhouse" && !token) || (source === "lever" && !slug)) {
    console.error(
      "Usage:\n  tsx scripts/add-company.ts --source greenhouse --name \"Name\" --domain example.com --token boardToken\n  tsx scripts/add-company.ts --source lever --name \"Name\" --domain example.com --slug companySlug",
    );
    process.exit(1);
  }

  const file = path.join(process.cwd(), "data", "companies.json");
  const raw = await readFile(file, "utf8");
  const directory = JSON.parse(raw) as Directory;

  if (source === "greenhouse") {
    directory.greenhouseBoards.push({ name, boardToken: token!, websiteDomain: domain });
  } else if (source === "lever") {
    directory.leverCompanies.push({ name, companySlug: slug!, websiteDomain: domain });
  } else {
    console.error("--source must be greenhouse or lever");
    process.exit(1);
  }

  await writeFile(file, JSON.stringify(directory, null, 2), "utf8");
  console.log("Added company to data/companies.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
