import { spawn } from "node:child_process";
import { ensureDatabase, createEmbeddedPostgres, getDatabaseUrl } from "./embedded-postgres";

async function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: getDatabaseUrl(),
      },
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

async function main() {
  const pg = createEmbeddedPostgres();
  try {
    await ensureDatabase(pg);

    await runCommand("npx", ["prisma", "generate"]);
    await runCommand("npx", ["prisma", "migrate", "deploy"]);
    await runCommand("npm", ["run", "prisma:seed"]);

    console.log("[db:prepare] Embedded PostgreSQL is ready and seeded.");
  } finally {
    await pg.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
