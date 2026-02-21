import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";

async function run() {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const migrationPath = path.join(currentDir, "../../migrations/001_init.sql");
  const sql = await readFile(migrationPath, "utf-8");

  await pool.query(sql);
  console.log("Migration complete");
  await pool.end();
}

run().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
