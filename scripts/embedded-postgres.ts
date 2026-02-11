import EmbeddedPostgres from "embedded-postgres";

export const DB_HOST = "127.0.0.1";
export const DB_PORT = 5432;
export const DB_USER = "postgres";
export const DB_PASSWORD = "postgres";
export const DB_NAME = "growjob";

export function getDatabaseUrl(dbName = DB_NAME) {
  return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${dbName}?schema=public`;
}

export function createEmbeddedPostgres() {
  return new EmbeddedPostgres({
    databaseDir: ".embedded-postgres/data",
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
    onLog: () => {
      // Keep output clean during normal runs.
    },
    onError: (error) => {
      console.error("[embedded-postgres]", error);
    },
  });
}

export async function ensureDatabase(pg: EmbeddedPostgres) {
  try {
    await pg.initialise();
  } catch (error) {
    const message = String(error ?? "").toLowerCase();
    if (
      !message.includes("data directory") &&
      !message.includes("already exist") &&
      !message.includes("already initialized")
    ) {
      throw error;
    }
  }
  await pg.start();
  try {
    await pg.createDatabase(DB_NAME);
  } catch (error) {
    const message = String(error ?? "");
    if (!message.toLowerCase().includes("already exists")) {
      throw error;
    }
  }
}
