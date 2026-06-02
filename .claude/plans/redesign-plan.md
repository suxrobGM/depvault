# DepVault Repo Vault Redesign Handoff (v3 — blob-only)

> Code-verified redesign. v3 adopts the **blob-only** model with **file-level versioning** (the
> simpler of the two options): a config file is stored as one encrypted blob — there are **no
> per-variable rows**. This removes an entire class of bugs by construction (key collisions, stale
> pruning, lossy re-serialization) and shrinks the backend dramatically.
>
> Test phase, no real users → **breaking changes are fine**. Clean-break migration; users re-run
> `depvault push`. **Delete legacy code outright — no shims, deprecation aliases, dual-read/write,
> feature flags, or `legacy_*` fallbacks** (see Dead-Code & Legacy Cleanup).

## What changed from v2 → v3 (read this first)

- **Blob-only storage.** `ConfigFile` stores the whole encrypted file. The `EnvVariable` /
  `EnvVariableVersion` tables and the entire `env-variable` + `env-io` per-entry machinery are
  **deleted**. The web renders a config file by downloading the blob, decrypting, and **parsing
  client-side** into a key/value table; edits re-serialize (via the already-correct
  `@depvault/shared` serializer), re-encrypt, and upload a new blob version.
- **File-level versioning.** Each push or web save snapshots the full encrypted blob
  (`ConfigFileVersion`). Restore = write a chosen version's blob. No per-variable history.
- **The stale-prune bug is gone by construction.** Replacing a file replaces its blob wholesale —
  there are no orphan keys to detect or delete, so `StaleVariableCleaner` and the prune prompt are
  removed entirely.
- **Models renamed** to drop the overloaded "Vault" word (see Naming).
- **Two explicit tradeoffs** (call them out to the user): (a) the per-key _required/description_
  overlay and the "required-filled" progress bar are **dropped** (they needed per-key rows); (b)
  server-side **search by key name is no longer possible** (the server never sees keys) — search
  becomes client-side after decrypt. Both are acceptable for the simpler model; flag if either must
  be preserved.

## Naming (the user asked for better model names)

The old `Vault` model collides conceptually with the **crypto** vault (`UserVault`, vault password,
`vault-provider`, lock/unlock). The redesign disambiguates by dropping "Vault" from the _storage_
models. Keep **"Environment Vault" / "Vault" as the product/marketing term**; rename only the schema.

| Old (v1/v2)                         | New (v3)                            | Meaning                                                                         |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `Vault`                             | **`App`**                           | one application/service root in the repo (e.g. `Logistics.API`). Thin grouping. |
| `ConfigSource` + `EnvVariable`      | **`ConfigFile`**                    | one config file: path + format + environment + encrypted blob                   |
| `EnvVariableVersion`                | **`ConfigFileVersion`**             | blob history of a config file                                                   |
| `SecretFile`                        | `SecretFile` (unchanged name)       | one secret file by exact `relativePath`                                         |
| `SecretFileVersion`                 | `SecretFileVersion` (unchanged)     | blob history of a secret file                                                   |
| `VaultEnvironment` (proposed table) | _(none — `environmentSlug` column)_ | environment is a column, not a table                                            |
| `CiToken`                           | `CiToken` (re-scoped)               | scoped to `(appId, environmentSlug)`                                            |

- Recommended display label for `App` in the UI: **"App"** (alt: "Service"). `appPath` = repo-relative
  root directory.
- **Alternative worth noting:** `ConfigFile` and `SecretFile` are now nearly the same shape (an
  encrypted blob at a `relativePath` under an `App`, with optional environment + versions). They
  could be unified into one **`RepoFile { kind: CONFIG | SECRET, format?, mimeType? }`** for the
  absolute-minimal schema. Default to keeping them **separate** — they differ in UX (editable
  key/value table vs download-only) and in scanning/CI semantics — but `RepoFile` is the lever if
  you want one fewer table.

## Context

DepVault's flat `Vault` model maps each file's **directory** to one vault
(`DirectoryVaultMapper.GroupByDirectory`), and `env-io.service.ts:50-54` upserts variables by
`(vaultId, key)`. So multiple config files in one folder collide on shared keys, pull collapses a
vault into one `.env` (`EnvPuller.cs:104-120`), and secret files lose their path
(`SecretsPuller.cs:61,89-99`). This breaks large repos like `logistics-app`, where one app holds
several environment-specific config files plus keystores, Firebase files, and signing keys.

### Observed bugs (corrected + completed)

1. **Same-key overwrite across env files** (`env-io.service.ts:50-54`, upsert by `(vaultId,key)`).
   _Repro caveat:_ auto-discovery **filters out git-tracked** `appsettings.*`
   (`FileScanner.cs:204-217`), so **committed** appsettings do **not** reproduce it via `depvault
push`. Real repros: gitignored appsettings, `.env.*` siblings (bypass the filter), or `--file`.
   Only **identical** flattened keys overwrite. → Eliminated: each file is its own `ConfigFile` blob.
2. **Stale-prune deletes the other environment's keys.** Already mostly mitigated by the per-vault
   key union (`PushCommands.cs:75-100`); survives only across separate single-file pushes. →
   **Eliminated by construction** in blob-only (no per-key prune at all).
3. **Pull loses original paths** (`EnvPuller.cs:104-120`, `SecretsPuller.cs:61,89-99`). → Fixed:
   `ConfigFile.relativePath` / `SecretFile.relativePath` + verbatim blob write.
4. **Secret discovery too narrow** (`FileScanner.cs:34-46`). → Broadened (see CLI).
5. **CLI JSON serializer is broken** (`JsonFileParser.cs:27-36` emits flat `__` keys; .NET won't
   bind). → **Off the critical path** entirely: pull writes the original blob; web edits use the
   correct `@depvault/shared` `setNested` serializer.
6. **yaml/toml have no CLI serializer** (`EnvFormat.cs:4-8`), yet are pushed
   (`FileScanner.cs:177-179`). → Fixed for free by blob-only.
7. **Secret pull truncates at 100** (`SecretsPuller.cs:30-33`). → Paginate.

## Product Model (blob-only)

```text
Project (a repo)
  └─ App                 one app/service root folder        identity (projectId, appPath)
       ├─ ConfigFile     one config file (encrypted blob)   identity (appId, relativePath)
       │    └─ ConfigFileVersion   blob snapshots
       └─ SecretFile     one secret file (encrypted blob)   identity (appId, relativePath)
            └─ SecretFileVersion   blob snapshots
```

Definitions:

- **`App`** — one application/service root. Identity `(projectId, appPath)` where `appPath` is the
  repo-relative root directory (see Inference). Holds `name` + `appPath` only; pure grouping.
- **`ConfigFile`** — one config file. Stores `relativePath` (repo-root-relative), `format`
  (`env` | `appsettings.json` | `secrets.yaml` | `config.toml` | …), `environmentSlug` (string,
  **open set**), `encryptedContent`/`iv`/`authTag` (the whole file), `fileSize`. Identity
  `(appId, relativePath)`. The blob is the **single source of truth** — pull writes it verbatim.
- **`SecretFile`** — one secret file. Same shape, plus `mimeType`; optional `environmentSlug`
  (null = base/neutral). Identity `(appId, relativePath)`.
- Versions snapshot the full encrypted blob on every overwrite. Restore-to-version is a write of a
  chosen snapshot's blob.
- **No `EnvVariable` table.** The web parses the decrypted blob client-side for display/edit.

### Source of truth, per surface

| Operation              | Reads                                                  | Notes                                                                                   |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `pull` (config/secret) | `*.encryptedContent` blob                              | verbatim write to `relativePath`, no serializer                                         |
| Web display            | blob → decrypt → parse client-side                     | config: Form table or Raw editor; plaintext secret: Raw editor; binary secret: download |
| Web edit → save (Form) | re-serialize via `@depvault/shared` → new blob version | correct serializer; broken CLI one is dead                                              |
| Web edit → save (Raw)  | re-encode UTF-8 → re-encrypt blob → new version        | no serializer; byte-faithful for any plaintext file                                     |
| `.env.example`         | parse blob client-side, strip values                   | no server-side per-key data                                                             |
| Versions               | `*Version` snapshots                                   | file-level restore                                                                      |
| Version diff           | decrypt two blobs → text diff client-side              | git-style unified/side-by-side; binary → "size changed" placeholder                     |
| CI pull                | blobs for `(appId, base ∪ selected env)`               | exact paths, client-side decrypt                                                        |

### File viewing & editing (GitHub-style raw editor)

Because every file is stored as a blob, the web can offer a **GitHub-like file view/edit** for any
**plaintext** file — config _or_ secret — with zero new storage and no serializer:

- **Open** a file → download blob → decrypt in-browser → render in an in-browser code editor
  (e.g. CodeMirror 6 or Monaco) with syntax highlighting by extension/format.
- **Edit** the raw text inline, **Save** → re-encode UTF-8 → re-encrypt the whole blob → POST a new
  `ConfigFileVersion` / `SecretFileVersion` (optional commit message). This is the same blob write
  path; no parsing/serialization, so a no-op open→save is byte-identical.
- **Plaintext-only.** Binary files (`.jks`, `.p12`, `.pfx`, images, DER certs) stay **download-only**.
  Detection is **client-side** (server is zero-knowledge): treat a blob as binary if it contains a
  NUL byte or fails strict UTF-8 decoding. The result is persisted as an `isBinary` hint
  (non-sensitive metadata) on the file so the list can show **Edit** vs **Download-only** without
  fetching the blob.
- **Two modes for config files:** a **Form** view (parsed key/value table) _and_ a **Raw** view (the
  text editor) — a toggle, like GitHub's "Edit"/"Preview". Plaintext **secret files** get the Raw
  editor only (e.g. a `.pem`, an IdentityServer signing-key JSON, a `.env`-style secret). The Raw
  editor also restores ctrl-F search within a file, partly offsetting the loss of server-side key
  search.
- **Diff & history (git-style).** The file's history lists every snapshot
  (`ConfigFileVersion`/`SecretFileVersion`) with author, timestamp, and optional commit message.
  Selecting any two versions — or comparing a pending edit against the current version before saving
  — renders a **git-style diff** (unified or side-by-side, line-level add/remove highlighting). The
  diff is computed **client-side**: the server holds only ciphertext and cannot diff, so the browser
  decrypts both blobs and runs a text diff (e.g. `jsdiff` + a diff viewer, or CodeMirror's merge
  view). The save flow shows this diff as a "review changes" pre-commit step, so an edit reads like a
  small commit. Binary files (`isBinary`) show a "binary file — size changed" placeholder, not a text
  diff.
- **Fidelity:** the editor must preserve the original EOL style (LF/CRLF) and final-newline so edits
  stay byte-faithful for `pull`; respect the same size cap as upload (≈1 MB) — larger plaintext is
  download-only. All editing is client-side: plaintext never leaves the browser unencrypted, so E2E
  holds even for secret files.

## Inference (pinned down)

CLI is authoritative; backend performs **zero inference** (zero-knowledge).

### Environment slug — open set, never collapse unknowns to `base`

- Suffix-less file (`appsettings.json`, bare `.env`) → `base` (reserved exclusively for these).
- `appsettings.<X>.json` / `.env.<X>` → `slug = slugify(lower(<X>))`, normalizing aliases
  (`development`→`dev`, `production`→`prod`, `stage`/`staging`→`staging`, `test`→`test`,
  `local`→`local` — do **not** fold `local` into `dev` as `TagSuggester` does today). Unknown
  segments keep their own slug (`QA`→`qa`, `Sandbox`→`sandbox`, `.env.uat`→`uat`).
- Relax the scanner's hard 2-dot guard (`FileScanner.cs:172`): accept `appsettings.json` and any
  `appsettings.<...>.json`.
- This is the single source of truth for environment. `TagSuggester` is **deleted**.

> The original "unknown → base" rule silently merged `appsettings.QA.json` into `base`, leaking QA
> values into the web base view and every CI pull (CI always includes base).

### App root — deterministic marker walk

For each discovered file, walk **up** to the repo root (`GitUtils.FindRepoRoot`) and pick the
**nearest** ancestor containing a project marker (reuse `EcosystemResolver`):
`.sln, .csproj, packages.config, Directory.Packages.props, package.json, go.mod, pom.xml,
build.gradle, build.gradle.kts, Cargo.toml, composer.json, Gemfile, pyproject.toml,
requirements.txt, Pipfile`.

- `appPath` = that ancestor's repo-relative path; `appName` = its last segment.
- **Nearest = closest marker** (nested apps stay distinct, no sibling collapse).
- No marker before repo root → fall back to the file's own directory. Ties → file's own directory.

### Stable identity (re-push is the migration path)

- `App` upserted by `(projectId, appPath)`; `ConfigFile`/`SecretFile` by `(appId, relativePath)`.
- Deterministic from file location → at least as stable as today's `directoryPath` anchor.

### CLI → backend contract (complete)

- **Config push** per file: `{ appPath, appName, environmentSlug, relativePath, format,
encryptedContent, iv, authTag, fileSize, isBinary }`. **No entries array** — the blob is the
  payload. `isBinary` is computed client-side (NUL byte or non-UTF-8).
- **Secret push** per file: same plus `mimeType` (and `environmentSlug` optional). The CLI computes
  `isBinary` so the web knows whether the secret is editable.
- Backend upserts `App → ConfigFile`/`SecretFile`, snapshots a version, stores everything opaque.

## Backend Changes

### Schema (clean break)

- `App { id, projectId, name, appPath, createdAt, updatedAt }`, `@@unique([projectId, appPath])`.
- `ConfigFile { id, appId, relativePath, format, environmentSlug, encryptedContent Bytes, iv,
authTag, fileSize, isBinary, createdAt, updatedAt }`, `@@unique([appId, relativePath])`.
  (`isBinary` is a client-computed hint for the web view; config files are normally text.)
- `ConfigFileVersion { id, configFileId, encryptedContent Bytes, iv, authTag, fileSize, changedBy,
createdAt }`.
- `SecretFile { id, appId, relativePath, environmentSlug?, encryptedContent Bytes, iv, authTag,
mimeType, fileSize, isBinary, ... }`, `@@unique([appId, relativePath])`; keep `SecretFileVersion`.
  (`isBinary` gates the raw editor: plaintext secrets like `.pem` are editable, binary ones are not.)
- `CiToken { id, projectId, appId, environmentSlug, wrappedDek/iv/tag, ... }`.
- **Delete** `Vault`, `EnvVariable`, `EnvVariableVersion` and the `env-variable`, `env-io`,
  `env-bundle` modules; **delete** `project-vault.clone` + `listTags`/`vault-tags`.
- Keep `ProjectKeyGrant`, `UserVault`, recovery/ECDH, wrapped-DEK logic **unchanged**.
- **Migration = clean drop** (precedent: `20260422120000_flatten_vault_model` does
  `TRUNCATE … CASCADE` + `DROP TABLE`). Drop the old tables, recreate the new chain `onDelete:
Cascade` from `Project` down. No backfill. Relax `validateFileName` to accept `/` in paths.

### API

- Apps: `GET/POST /api/projects/:id/apps`, `GET/PATCH/DELETE …/apps/:appId`.
- Config files: `GET/POST/PUT/DELETE …/apps/:appId/config-files[/:fileId]`. `POST`/`PUT` accept the
  blob payload; the server snapshots a `ConfigFileVersion` on each write. `GET …/config-files/:id`
  returns the blob; `GET …/config-files/:id/versions` + `POST …/versions/:vid/restore`.
- Secret files: `GET/POST/DELETE …/apps/:appId/secret-files[/:fileId]`; upload/list/download carry
  `relativePath`; **list paginates** beyond 100.
- Repo map: `GET /api/projects/:id/repo-map` → apps grouped by `appPath`, each with its config files
  (path/format/env/size) and secret files.
- Export: `POST …/export` scoped to one file / one environment / one app / full repo → returns the
  selected blobs for client-side decrypt (replaces `env-bundle`).
- CI tokens: scoped `(appId, environmentSlug)`. `fetchSecrets` returns the same App's `base` files
  ∪ the selected environment's files (config + secret), **never crossing Apps** (least privilege):
  `where: { app: { id: token.appId }, environmentSlug: { in: ['base', token.environmentSlug] } }`.
  Keep `fetchSecrets` unbounded. Response replaces `vaultId`/`vaultName` with
  `appId`/`appName` + `environmentSlug`.

### Backend services to delete / rewrite

- **Delete:** `env-variable` (CRUD + versions), `env-io` (import/export/example),
  `env-bundle`, `project-vault.clone`/`listTags`, `ProjectVaultRepository.requireVault`,
  `StaleVariableCleaner` server counterpart (no prune).
- **Replace `project-vault`** with `app` (CRUD) + `config-file` (CRUD + versions) modules.
- **Rewrite `ci-token`** `fetchSecrets`/`downloadFile` to the `(appId, environmentSlug)` union.
- **`secret-file`**: upsert key `(appId, relativePath)`; drop the cross-vault `update({ vaultId })`
  move; re-scope list/`findFileOrThrow` off the old `vault` relation.

## CLI Changes

Regenerate the Kiota client. `--exclude-backward-compatible` = no shims; the `Vaults → Apps` /
`/import → config-files` rename forces edits in every aliasing file (`EnvImporter.cs:7-8`,
`EnvPuller.cs:6-7`, `SecretsPuller.cs:5`, `DirectoryVaultMapper.cs:1,6`, `StaleVariableCleaner.cs:41`,
`SecretFileScanner.cs:8`, `CiCommands.cs:41`, `EnvCommands.cs:45`, `VaultResolver.cs`,
`VaultSelector.cs`).

`depvault push`:

- Discover config + secret files; infer `appPath` (marker walk) + `environmentSlug` (open-set rules).
- For each file: **encrypt the whole file bytes** and upload the blob (with metadata). **No parsing,
  no per-variable entries, no comment codec.** Encryption unchanged (project DEK; `VaultCrypto.Encrypt`
  over bytes, like secret files today).
- No client-side stale pruning — replacing a file replaces its blob.
- Send secret files by exact `relativePath` (`SecretFileScanner.UploadAsync`: use `file.RelativePath`,
  not `file.FileName`).
- Broaden secret discovery (`.crt`, `.cer`, signing-key/cloud-cred JSON, Firebase/AdminSDK, mobile
  configs) and **reuse `SecretScanning/FileFilter` guards** (1 MB cap; exclude
  `fixtures`/`testdata`/`tests`/`docs`, `*.example`/`*.sample`/`*.template`, source extensions).
  For generic `.key`/`.crt`, prefer content sniffing (PEM `-----BEGIN`, PKCS#12 magic).

`depvault pull`:

- **Byte-faithful by default**: decrypt each `ConfigFile`/`SecretFile` blob and write verbatim to
  `relativePath`, recreating directories. No serialization. json/yaml/toml/env restore exactly.
- `--format` becomes explicit conversion/export only.
- Add `--app`, `--environment`, `--include-base`; paginate secret + config lists.
- Remove `EnvPuller.ResolveEnvFilePath` / `SecretsPuller.ResolveSecretsDir` derived-path logic.

`depvault ci pull` (rewrite): reshape `/api/ci/secrets` to return grouped blobs `{ relativePath,
format, environmentSlug, encryptedContent, iv, authTag, mimeType? }` for `(appId, base ∪ env)`;
rewrite `CiCommands` to decrypt client-side (existing `DeriveCiWrapKey`/`UnwrapKey`, preserved) and
write each to its exact path.

Other CLI: rewrite `EnvCommands`/`VaultResolver`/`DirectoryVaultMapper`/`VaultSelector` to
app/environment/file builders; `SecretsCommands` columns → `relativePath`/environment; **delete**
`TagSuggester`, `--tag`/`MatchByTags`, and the now-unused `EnvFiles` serializers (`JsonFileParser`,
`EnvFileSerializer`, `CommentCodec` — keep parsers only if `--format` conversion is retained).
`VaultCommands` (crypto unlock/lock) is **unaffected**.

## Web Changes

Replace the vault page (route group `vault/(vault-tabs)/{variables,secret-files}`,
`VaultLayoutShell`, `VaultTabs`) with a repo browser.

- **Left pane:** apps grouped by `appPath` (from `repo-map`).
- **Environment selector:** `DISTINCT environmentSlug` per app.
- **Main area:** config files open in a **file editor** with a **Form** view (parsed key/value table;
  save re-serializes via `@depvault/shared`) and a **Raw** view (GitHub-style code editor over the
  decrypted text; save re-encrypts the whole blob). **Plaintext** secret files (`.pem`, signing-key
  JSON, etc.) also open in the Raw editor; **binary** secrets (`isBinary`) stay download-only cards.
  Every save posts a new `ConfigFileVersion`/`SecretFileVersion`; file version history shows a
  **git-style diff** between any two versions (and a pre-commit "review changes" diff on save), plus
  restore. See **File viewing & editing** above for binary detection, diffing, EOL fidelity, and the
  size cap.
- Import = upload a config/secret file (blob). Export = one file / environment / app / repo.
- CI token dialog selects **app + environment**, notes `base` is always included.

Frontend disposition:

- **Drop:** `vault-list*.tsx`, `create-vault-dialog.tsx`, `clone-vault-dialog.tsx`,
  `vault-tag-chip/input.tsx`, the `vault-tags` query key/endpoint, the edit-secret "Move to Vault"
  select, and the per-variable components (`variable-row/table.tsx`, `create/edit-variable-dialog.tsx`,
  `import/export-variables-dialog.tsx`, `variable-history.tsx`) — superseded by the file editor +
  file version history.
- **Rework:** `variables-view.tsx` → config-file editor; `secret-files-*`; `download-bundle-dialog`
  → Export; `vault-tabs.tsx` + `(vault-tabs)` route group → app/env browser; `vault-layout-shell.tsx`;
  `query-keys.ts`; out-of-folder callers `overview/vault-summary-card.tsx`,
  `settings/create-ci-token-dialog.tsx`.
- **Survive:** `encrypted-value.tsx` (reusable masked field), `providers/vault-provider.tsx`
  (per-project DEK — regrouping needs no re-encryption).

## Encryption Requirements (UNCHANGED — verified)

- One project DEK per project; ciphertext bound to `projectId`, never to the grouping → no
  re-encryption when re-parenting or renaming. Config blobs are encrypted exactly like secret files
  today.
- Client encrypts; server stores ciphertext + opaque metadata (paths, app names, env slugs) and
  **never** decrypts. `UserVault`, `ProjectKeyGrant` (SELF/ECDH/RECOVERY), recovery, CI wrapped-DEK
  unchanged. CI `create` still re-wraps the project DEK; only its existence check changes to
  app+environment.

## Dropped Features (aggressive, test phase)

- Tags subsystem (`/vault-tags`, `listTags`, `--tag`, `MatchByTags`, `TagSuggester`, tag UI).
- `cloneVault` (route, service, dialog).
- Cross-vault secret "move".
- Per-variable rows and per-variable history (→ file-level), per-key **required/description overlay**
  - "required-filled" progress (tradeoff — flag if needed), server-side key search (→ client-side).
- `env-bundle` → folded into Export.

## Migration Checklist

- **Backend:** delete `env-variable`/`env-io`/`env-bundle` + `project-vault.clone`/`listTags`; add
  `app` + `config-file` modules; rewrite `ci-token`; re-scope `secret-file`; new Prisma migration
  (drop old tables, create new chain).
- **Backend tests (expect `bun test` red until updated):** delete/rewrite `env-io.service.test.ts`,
  `ci-token.service.test.ts`, `secret-file.service.test.ts`, `secret-file-version.service.test.ts`.
- **CLI:** regen Kiota; rewrite the 10 aliasing files; delete `TagSuggester`/`--tag` and the
  serializer classes; byte-faithful pull; relativePath secret upload; paginated pulls; ci-pull rewrite.
  Keep `DepVault.Cli.Tests` green (add an appsettings byte round-trip test).
- **Frontend:** per the disposition list; `bun run typecheck` must pass.
- **Safe to ignore:** `convert`, `shared-secret` (projectId-scoped), `VaultCommands`, crypto/key-grant/
  vault-provider.

## Dead-Code & Legacy Cleanup (delete, don't deprecate — no shims)

**Principle:** clean break, no users → **delete** old code paths outright. No deprecation shims,
compatibility aliases, dual-read/dual-write, feature flags, `legacy_*` tables, or commented-out old
code. There is no migration window to support. The redesign is "done" only when **no reference to the
old model remains**.

Remove entirely:

- **Backend:** the `env-variable/`, `env-io/`, `env-bundle/` modules; `project-vault` clone + tags
  (replace `project-vault` with `app` + `config-file`); the stale-prune logic — including their
  controllers, services, repositories, mappers, schemas, and tests.
- **Prisma:** delete the `Vault`, `EnvVariable`, `EnvVariableVersion` models and their
  relations/back-relations on `Project`/`User`. The migration **drops** the old tables (no
  rename-to-`legacy_*`). Remove now-unused enums/indexes (e.g. the `tags` GIN index).
- **Generated client (Kiota):** regenerate with `--exclude-backward-compatible` and **delete** the
  stale `…/Vaults/**` request builders + request-body types. No hand-kept shims for old routes.
- **CLI:** delete `TagSuggester`, `--tag`/`MatchByTags`, `DirectoryVaultMapper`'s directory→vault
  logic, the unused `EnvFiles` serializers (`JsonFileParser`, `EnvFileSerializer`, `CommentCodec`;
  keep parsers only if `--format` conversion is retained, else delete), and all `--vault`/`--vault-id`/
  `directoryPath`/`tags` plumbing.
- **Frontend:** delete the dropped components/routes/query-keys (vault-list*, tag chip/input,
  clone/create-vault dialogs, per-variable dialogs/history, the `(vault-tabs)` route group,
  `vaults.*` query keys). No compatibility re-exports.
- **Shared/types:** remove old vault/env-variable types, response schemas, and any
  `directoryPath`/`tags`/`vaultId` fields from `@depvault/shared`; drop superseded parsers/serializers.

**Verification — cleanup is incomplete until all pass:**

- `git grep` returns **zero** hits (outside intended deletions) for: `vaultId`, `directoryPath`,
  `EnvVariable`, `env-io`, `env-bundle`, `vault-tags`, `TagSuggester`, `--tag`, `ResolveEnvFilePath`,
  `ResolveSecretsDir`, `StaleVariableCleaner`, `cloneVault`, and the old operationIds (`createVault`,
  `listVaults`, `importEnvVariables`, `exportEnvVariables`, `listVaultTags`). For `Vault`/`vault`,
  confirm remaining hits are **only** the crypto vault (`UserVault`, `vault-provider`, `VaultCommands`,
  vault password/lock) — intentionally retained.
- `bun run typecheck` (all workspaces), `dotnet build`, and `bun run build` pass with **no
  unused-export or dead-import warnings**; remove orphaned imports the deletions leave behind.
- No `@deprecated`, `// legacy`, `// TODO: remove`, back-compat branches, or commented-out old code
  remain from this work.

## Documentation & Marketing Updates (the user asked for this)

Do **not** publish these before the feature ships (they'd describe nonexistent behavior); update them
as part of the rollout PR. Files that reference the old vault/`directoryPath`/`tags`/per-variable model:

**Repo docs (`docs/`):**

- `docs/prd.md` — US-01…US-10 + acceptance criteria mention vaults/tags; rewrite the vault user
  stories around App → ConfigFile/SecretFile + environments.
- `docs/architecture.md` — data model + module list (env-variable/env-io/env-bundle removed).
- `docs/api-reference.md` — replace `/vaults` + `/import`/`/export` endpoints with
  `/apps` + `/config-files` + `/secret-files` + `/repo-map` + `/export`.
- `docs/cli.md` — `push`/`pull`/`ci pull` flags (`--app`/`--environment`, `--tag` removed,
  byte-faithful pull) and the env/secrets command changes.
- `docs/ui-mockups.md` — re-wireframe the vault screens as the repo browser + file editor.

**Docs site (`apps/docs/`, Nextra):**

- `guides/environment-vault/page.mdx` — core rewrite (App/ConfigFile/environments, no per-variable
  vault) + the GitHub-style raw file viewer/editor, version history with git-style diffs, and the
  plaintext-vs-binary behavior.
- `cli/env/page.mdx`, `cli/pull/page.mdx`, `cli/secrets/page.mdx`, `getting-started/page.mdx` — CLI
  surface + flags.
- `guides/secret-files/page.mdx` — relativePath restore.
- `guides/ci-cd-integration/page.mdx` — CI token scope (app + environment, base always included).
- `guides/encryption/page.mdx` — confirm blob = encrypted-file model (per-project DEK unchanged).

**Landing page (`apps/frontend/src/components/features/public/`):**

- `feature-vault.tsx` — **mostly already aligned** (it markets DEV/STAGING/PROD environment tabs +
  "Version History", which the new model finally delivers honestly). Minor: ensure the "Version
  History" chip reads as file-level history; the env tabs now map to real `environmentSlug`s.
- Skim `feature-cards.tsx`, `how-it-works-section.tsx`, `security-section.tsx` for any
  "per-variable" / "tags" phrasing.

**Project instructions:**

- `CLAUDE.md` (vault model description), `.claude/rules/encryption.md` (key-files table → `App`/
  `ConfigFile`), `.claude/rules/backend/database.md` (model list), `.claude/rules/cli/conventions.md`
  (push/pull description).

## Test Plan

Backend:

- Two config files in one app with the same key store **separately** (different blobs, no collision).
- Config blob round-trips json/yaml/toml/env **byte-for-byte**.
- File version snapshot on every write; restore writes the chosen blob.
- Secret files upsert/download by `relativePath`; two same-basename secrets in different apps don't
  collide.
- CI `fetchSecrets` returns **only** base ∪ selected env for the **same** App (+ cross-App leakage
  assertion).
- `>100` files list/pull (pagination).

CLI:

- Logistics-style fixture (gitignored / `.env.*` siblings) round-trips multiple apps to **distinct
  files**, byte-for-byte (incl. nested `appsettings.json`, `config.toml`).
- Marker walk: `Logistics.API` and `Logistics.IdentityServer` → distinct Apps; their dev/prod
  appsettings → same App, distinct ConfigFiles.
- Env-slug: `appsettings.json` + `appsettings.QA.json` → `base` vs `qa` (QA excluded from other envs).
- Broadened secret discovery catches keystores/Firebase/signing-keys without source/fixtures.
- `dotnet test … DepVault.Cli.Tests` green.

Web:

- Repo browser renders apps, environments, config files (editable table), secret files.
- Edit a config file → save → pull → file still binds (round-trips via `@depvault/shared`).
- **Raw editor:** open a plaintext config and a plaintext secret (`.pem`), a no-op open→save is
  **byte-identical** (EOL + final-newline preserved); a binary secret (`.jks`) shows download-only
  (no editor), gated by `isBinary`.
- **Version diff:** editing a config file then comparing the two versions shows a git-style diff with
  the changed lines highlighted (client-side decrypt of both blobs); the pre-commit "review changes"
  diff matches; a binary file shows the placeholder, not a text diff.
- File version history + restore works; CI-token flow uses app + environment.

## Acceptance Criteria

- `depvault push` on `logistics-app` stores dev and prod values separately.
- Web switching `dev`/`prod` shows different decrypted values when files differ.
- `depvault pull` restores files to identical repo-relative paths, **byte-for-byte** (no broken
  nested JSON).
- No stale-variable prune anywhere (it cannot occur).
- Secret files restored exactly where runtime tools expect; `>100` files supported.
- `appsettings.QA.json` never collapses into `base`.
- Re-running `depvault push` updates the same Apps/ConfigFiles (no duplicates).
- File-level version history records each change; restore works.
- A plaintext config or secret file can be opened, edited as raw text, and saved in the web (like a
  GitHub file edit); binary files are download-only; a no-op edit round-trips byte-for-byte.
- Comparing two versions of a plaintext file shows a git-style diff (computed client-side); the save
  flow previews the same diff before committing.
- E2E encryption preserved (no re-encryption on re-parenting; raw edits stay client-side).
- Stale docs + landing copy updated in the rollout PR.
