import cron from "node-cron";
import { ingestAllCompanies } from "../src/lib/ingest";

async function run() {
  const stats = await ingestAllCompanies();
  console.log(`[cron] ingest complete`, stats);
}

cron.schedule("5 0 * * *", async () => {
  try {
    await run();
  } catch (error) {
    console.error("[cron] ingest failed", error);
  }
});

console.log("[cron] GrowJob ingestion scheduler started (00:05 UTC daily)");
