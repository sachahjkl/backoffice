#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdirSync, readFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const database = process.env["DATABASE_PATH"] ?? join(process.cwd(), "data/froment.sqlite");
const action = process.argv[2] ?? "start";
const typst =
  process.env["TYPST_PATH"] ??
  process.env["PATH"]
    ?.split(delimiter)
    .map((directory) => join(directory, "typst"))
    .find((candidate) => {
      try {
        accessSync(candidate, constants.X_OK);
        return true;
      } catch {
        return false;
      }
    });

if (!["start", "migrate", "backup", "demo-reset"].includes(action) || process.argv.length > 3) {
  console.error("Usage: froment-backoffice [start|migrate|backup|demo-reset]");
  process.exit(64);
}

const deploymentMetadata =
  process.env["DEPLOYMENT_METADATA"] ??
  JSON.stringify({
    commit: "0".repeat(40),
    packages: [
      { name: "@froment/api", version: manifest.version },
      { name: manifest.name, version: manifest.version },
    ],
  });

Object.assign(process.env, {
  DATABASE_PATH: database,
  MIGRATIONS_ROOT: join(root, "drizzle"),
  DOCUMENT_TEMPLATES_PATH: join(root, "templates"),
  DOCUMENT_FONTS_PATH: process.env["DOCUMENT_FONTS_PATH"] ?? join(root, "web/fonts"),
  STATIC_ROOT: join(root, "web"),
  BUSINESS_TIME_ZONE: process.env["BUSINESS_TIME_ZONE"] ?? "Europe/Paris",
  PORT: process.env["PORT"] ?? "3000",
  TYPST_PATH: typst ?? "typst",
  DEPLOYMENT_METADATA: deploymentMetadata,
});

if (action !== "backup") mkdirSync(dirname(database), { recursive: true });

if (action === "start") {
  const migration = spawnSync(process.execPath, [join(root, "migrate.cjs")], {
    env: process.env,
    stdio: "inherit",
  });
  if (migration.error) throw migration.error;
  if (migration.status !== 0) process.exit(migration.status ?? 1);
}

await import(join(root, action === "start" ? "main.cjs" : `${action}.cjs`));
