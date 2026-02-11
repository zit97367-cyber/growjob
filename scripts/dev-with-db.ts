import { spawn } from "node:child_process";
import net from "node:net";
import { createEmbeddedPostgres, ensureDatabase, getDatabaseUrl } from "./embedded-postgres";

function isPortOpen(port: number, host = "127.0.0.1") {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function main() {
  // If app is already running, do not try to start another instance.
  if (await isPortOpen(3000)) {
    console.log("[dev:with-db] GrowJob is already running at http://localhost:3000");
    return;
  }

  const pg = createEmbeddedPostgres();
  await ensureDatabase(pg);

  const nextDev = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: getDatabaseUrl(),
    },
  });

  const stopAll = async () => {
    nextDev.kill("SIGINT");
    await pg.stop();
    process.exit(0);
  };

  process.on("SIGINT", stopAll);
  process.on("SIGTERM", stopAll);

  nextDev.on("exit", async (code) => {
    await pg.stop();
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Failed to start dev server with embedded database";
  console.error(`[dev:with-db] ${message}`);
  process.exit(1);
});
