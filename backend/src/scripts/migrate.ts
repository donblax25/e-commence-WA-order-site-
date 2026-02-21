import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";

async function run() {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const migrationPath1 = path.join(currentDir, "../../migrations/001_init.sql");
  const migrationPath2 = path.join(currentDir, "../../migrations/002_add_customers.sql");
  
  const sql1 = await readFile(migrationPath1, "utf-8");
  const sql2 = await readFile(migrationPath2, "utf-8");

  await pool.query(sql1);
  console.log("Migration 001 complete");
  
  await pool.query(sql2);
  console.log("Migration 002 complete");
  
  await pool.end();
}

run().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
