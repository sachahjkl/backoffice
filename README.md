# Backoffice

This repository contains the backoffice application and its npm package, `@sachahjkl/backoffice`.
It contains an Angular web application and an Effect API backed by SQLite.

## Development

Use Node.js 26.7 or later within the 26.x series and pnpm 11.25.0, or enter `nix develop`.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm lint
pnpm format:check
```

The workspace contains `packages/web`, `packages/api`, `packages/contracts`, `packages/documents`, and `packages/app`.
Run `pnpm build:app` to assemble the server, web assets, templates, and database migrations in `packages/app/dist`.
Run `npm pack --dry-run ./packages/app` to inspect the npm package.

The Nix flake exposes build, test, lint, format, and npm package integrity checks.
CI runs these checks on pushes and pull requests to `master`.
CI does not publish packages or deploy the application.

## Run the app package

After `pnpm build:app`, configure the required authentication secrets.
Set `BOOTSTRAP_PASSWORD_SCRYPT` and `PASETO_SECRET_KEY` in the process environment.
Then start the local package:

```sh
DATABASE_PATH="$PWD/data/backoffice.sqlite" PUBLIC_ORIGIN=http://localhost:3000 \
  node packages/app/bin/backoffice.mjs
```

The start command applies pending migrations before starting the server on port 3000.
Set `DATABASE_PATH` to a persistent SQLite file and `PUBLIC_ORIGIN` to the exact public origin.
See [deployment](docs/deployment.md) for the instance migration and [backup guidance](docs/backups.md) for data transfer.

## Deployment ownership

The real instance belongs at `https://backoffice.froment.software`.
It needs its own domain routing, runtime settings, secrets, storage, backups, and deployment configuration.
The demo belongs in a separate repository with isolated data and credentials.
Neither instance is deployed by this repository's GitHub Actions.

The old marketing site at `froment.software` is a separate service.
See [deployment](docs/deployment.md) before moving the existing backoffice instance.
