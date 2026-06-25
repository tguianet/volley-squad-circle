/**
 * Aplica migration SQL no Lovable Cloud via conexão Postgres direta.
 * Configure DATABASE_URL no .env (Cloud → Database → Connection string → URI).
 *
 * Uso: node --env-file=.env scripts/apply-lovable-migration.mjs [arquivo.sql]
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const file =
  process.argv[2] ??
  path.join("supabase", "migrations", "20260624130000_lovable_cloud_features_sync.sql");

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error(
    "❌ DATABASE_URL não configurado. Copie a connection string em Lovable → Cloud → Database.",
  );
  process.exit(1);
}

const sql = fs.readFileSync(file, "utf8");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log(`Aplicando ${file}…`);
  await client.query(sql);
  console.log("✅ Migration aplicada com sucesso.");
} catch (e) {
  console.error("❌ Falha ao aplicar migration:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
