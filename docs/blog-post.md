# I got tired of passing .env files in my Telegram, so I built a vault platform for env vars, secrets, and dependency analysis

If you've worked on a team where `.env` files get passed around in Slack DMs, you know the problem. I've been there. Three repos, three different stacks, and I'm running `npm audit`, `pip-audit`, and `dotnet list package --vulnerable` one after another just to get a rough picture of where things stand. Then there's the secrets side: someone pastes a database password in a group chat, it sits in the scroll history forever, and six months later nobody remembers which values are current.

I wanted one place for all of it. That became DepVault: a web dashboard for analyzing dependencies across 8+ ecosystems and storing secrets in an encrypted vault. It started as a class project, but I built it around a problem I actually had.

Live app: [depvault.suxrobgm.net](https://depvault.suxrobgm.net) | Source: [github.com/suxrobgm/depvault](https://github.com/suxrobGM/depvault)

![Dashboard](./images/dashboard.jpg)

## One scan, every ecosystem

Connect your GitHub repo and DepVault automatically finds and scans every dependency file in the project - `package.json`, `requirements.txt`, `libs.versions.toml`, `go.mod`, `.csproj`, `Cargo.toml`, `build.gradle`, `Gemfile`, `composer.json`, all of it. You can also upload files manually if you prefer. Either way, you get a single table showing what's outdated, what has known CVEs, and what licenses you're pulling in. Eight ecosystems, one view.

![Dependency Analysis](./images/project-dependencies-2.jpg)

Most teams I've worked with check dependencies differently per stack. The Node project gets `npm audit`, the Python service gets `pip-audit` if someone remembers to run it, and the .NET API gets nothing until something breaks. DepVault treats them all the same - connect the repo once and it picks up every dependency file it recognizes, across every language in the project. No local tooling, no switching between CLIs.

The vulnerability data comes from OSV.dev, which aggregates advisories from the NVD, GitHub, PyPA, RustSec, and others. If a CVE exists for something in your dependency tree, it shows up.

## Your secrets, actually encrypted

Each project in DepVault has a vault. You create environments (development, staging, production), add your variables, and they're encrypted with AES-256-GCM before anything touches the database. Not "encrypted in transit." Encrypted at rest, per value, with unique IVs.

![Environment Vault](./images/project-env-vars.jpg)

There's version history for every variable. Changed a database URL three weeks ago and need the old one? It's there. Want to compare what's different between staging and production? The diff view puts them side by side.

![Variable History](./images/project-env-vars-history.jpg)

You can also store secret files: SSL certificates, private keys, provisioning profiles, keystores. Same encryption, same versioning.

## Stop pasting passwords in Slack

This is the feature that got the most reaction when I showed it to people. Instead of dropping a database password into a group chat where it lives forever, you generate a one-time link. The recipient opens it, sees the value, and the content is permanently deleted. Not archived. Not soft-deleted. Gone.

![Secret Sharing](./images/share-secret.jpg)

You can set an expiration window and add optional password protection. For teams that need to onboard new developers or share credentials with contractors, this replaces the "check your DMs" workflow entirely.

## CI/CD without .env files

One of the more practical features: generate scoped tokens that your CI pipeline uses to pull secrets at build time. Your GitHub Actions job authenticates with a short-lived token, fetches the variables it needs, and nothing gets committed to the repo.

![CI Integration](./images/ci-integration.jpg)

No more `.env` files checked into private repos "just for CI." No more secret values hardcoded in pipeline YAML. The token is scoped to a specific project and environment, so a staging token can't read production secrets.

![CI Token Generation](./images/generate-ci-token.jpg)

## Catch secrets before they ship

DepVault has a built-in secret scanner that checks your code for accidentally committed credentials. AWS keys, GitHub tokens, database connection strings, private keys - it catches them using built-in patterns, and you can add custom regex rules for your own formats.

![Security Dashboard](./images/security-page.jpg)

It runs on a schedule and flags anything it finds. Better to catch a leaked key in a dashboard than in a production incident.

## The small things that save time

A few utilities that turned out to be more useful than I expected:

**Config converter.** Paste an `appsettings.json`, get back a `.env` file. Or convert `.env` to YAML, YAML to TOML, TOML to JSON. I built this because I kept doing it by hand when switching between projects.

![Config Converter](./images/converter.jpg)

**Environment templates.** Create a template with all the variables a new environment needs (keys, descriptions, required flags) and stamp out new environments from it. Useful for onboarding and for keeping staging and production consistent.

**Download bundles.** Select the variables and secret files you need, download them as an encrypted zip with a one-time password. Handy for setting up a new machine or sharing a complete environment with a teammate.

**Activity logs.** Every vault operation is logged: who changed what, when, from where. The audit trail is append-only - nothing gets edited or removed.

![Activity Log](./images/activity-log.jpg)

## Who this is for

I built DepVault for small teams and solo developers who work across multiple stacks. If you're running a Node.js frontend, a Python ML service, and a .NET API, you probably don't want three different tools for dependency health. And if your team is still sharing secrets over Slack, that's a problem DepVault actually solves.

The whole thing is open source. The tech stack is Bun, Elysia.js, Next.js 16, PostgreSQL, and Prisma - if you're curious about the architecture, the [docs](https://github.com/suxrobGM/depvault/tree/main/docs) cover it in detail.

## Try it out

DepVault is live at [depvault.suxrobgm.net](https://depvault.suxrobgm.net). Source code is at [github.com/suxrobgm/depvault](https://github.com/suxrobGM/depvault). Create an account, throw a `package.json` at it, see what turns up.
