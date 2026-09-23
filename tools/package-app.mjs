import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const repository = resolve(import.meta.dirname, "..");
const packageRoot = join(repository, "packages/app");
const output = join(packageRoot, "dist");
const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
const api = JSON.parse(await readFile(join(repository, "packages/api/package.json"), "utf8"));
const root = JSON.parse(await readFile(join(repository, "package.json"), "utf8"));
const workspace = await readFile(join(repository, "pnpm-workspace.yaml"), "utf8");

if (manifest.version !== api.version || manifest.version !== root.version) {
  throw new Error("app_version_mismatch");
}
if (manifest.dependencies.argon2 !== api.dependencies.argon2) {
  throw new Error("app_argon2_version_mismatch");
}
const sqliteVersion = workspace.match(/^  better-sqlite3: "([^"]+)"$/m)?.[1];
if (manifest.dependencies["better-sqlite3"] !== sqliteVersion) {
  throw new Error("app_sqlite_version_mismatch");
}

const assets = [
  ["packages/api/dist/main.cjs", "main.cjs"],
  ["packages/api/dist/migrate.cjs", "migrate.cjs"],
  ["packages/api/dist/backup.cjs", "backup.cjs"],
  ["packages/api/dist/demo-reset.cjs", "demo-reset.cjs"],
  ["packages/api/drizzle", "drizzle"],
  ["packages/documents/templates", "templates"],
  ["packages/web/dist/froment-software/browser", "web"],
];

for (const [source] of assets) {
  await stat(join(repository, source));
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const [source, destination] of assets) {
  await cp(join(repository, source), join(output, destination), { recursive: true });
}
console.log(`Assembled ${manifest.name}@${manifest.version} in ${output}`);
