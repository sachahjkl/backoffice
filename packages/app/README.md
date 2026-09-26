# @sachahjkl/backoffice

Standalone Froment Software backoffice server and web application.

## License

This package is proprietary software. You must obtain prior written permission from Sacha Froment before using it. Permission may be granted free of charge or for a fee. Send requests through [froment.software](https://froment.software) or to [contact@froment.software](mailto:contact@froment.software). See [LICENSE](LICENSE) for the complete terms.

## Install

Install Node.js 26.7 or later in the 26.x series and Typst. Install the package in your application:

```sh
npm install @sachahjkl/backoffice
```

Set `PUBLIC_ORIGIN` to the URL that users open. Set `BOOTSTRAP_PASSWORD_SCRYPT`, `PASETO_SECRET_KEY`, `REFRESH_HMAC_KEY`, `API_TOKEN_HMAC_KEY`, and `QUOTE_LINK_HMAC_KEY` before starting the server. Supply each key from your secret manager.

Start the server from the directory that will contain the database:

```sh
npx froment-backoffice
```

The command creates `data/froment.sqlite`, applies database migrations, and listens on port 3000. It serves the packaged web application.

Set `DATABASE_PATH` to use a different database file. Set `PORT` to use a different port. Set `TYPST_PATH` to the absolute path of Typst if it is not on `PATH`. The package includes the Cousine fonts and document templates used for PDF documents. Set `BUSINESS_TIME_ZONE` to override `Europe/Paris`.

In Configuration, upload a PNG, JPEG, or WebP logo of up to 256 KB. The application stores it with the branding settings in the database. Without an uploaded logo, the package uses its default logo or the instance's `ENTERPRISE_LOGO_URL`.

Run `npx froment-backoffice migrate` to apply migrations without starting the server. Run `npx froment-backoffice backup` with `BACKUP_ACTION` and `BACKUP_PATH` to create, verify, or restore a backup.

For a separate demo installation, set `APP_ENV=staging`, `DEMO_MODE=true`, `DEMO_PASSWORD`, and a different `DEMO_ACCOUNT_PASSWORD`. Set `ENTERPRISE_NAME` before `demo-reset` to name the company in its settings and generated documents. Run `npx froment-backoffice demo-reset` to migrate the database and create synthetic accounts and data. The login page displays the demo account credentials only in demo mode. Schedule this command to restore the demo data when needed.

See the source repository's `docs/secrets.md` and `docs/runtime-configuration.md` for deployment settings.

## Build a local package from source

Run `pnpm pack:app` at the repository root. This builds the API and web application, assembles the assets, and writes an npm tarball to the repository root. Install the generated tarball with `npm install ./sachahjkl-backoffice-*.tgz` in the consuming application.
