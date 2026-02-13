import { ingestAndCacheJobs } from "../src/lib/ingest/index";

async function main() {
  const { stats } = await ingestAndCacheJobs(true);
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
