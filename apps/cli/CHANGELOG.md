# Changelog

All notable changes to the DepVault CLI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.5] - 2026-06-25

- `unlock --remember [--ttl 7d]`: optionally persist the derived KEK (never the password) encrypted at rest — DPAPI on Windows, an owner-only AES-GCM key on POSIX — so the vault stays unlocked across invocations without retyping the password (default 7d, max 30d); `lock`/`logout` clear it
- Add a `purge` command: the inverse of `pull`, deleting previously pulled files from disk; previews and confirms (defaults to No), requires `--force` non-interactively, and supports `--dry-run`/`--no-prune`

## [1.8.4] - 2026-06-04

- Auto-switch the active project to the one matching the current repository (by remote URL, then name) when they diverge, instead of only printing a warning — supersedes the v1.8.2 mismatch warning, which now appears only when no project matches the repo
- Add a `clear` command (and REPL `clear`/`cls`) to clear the terminal screen

## [1.8.3] - 2026-06-03

- `push`: skip re-uploading a file whose contents haven't changed, so repeated pushes no longer create redundant version-history entries (the CLI now sends a keyed content hash the server uses to detect no-op pushes)

## [1.8.2] - 2026-06-03

- `project` create: default the new-project name to the current repo's directory and auto-fill the repository URL from `git remote origin`
- Warn when the active project doesn't match the current repository, giving an early signal to switch projects

## [1.8.1] - 2026-06-03

- Fix `scan` secret leak detection incorrectly flagging gitignored files: replace the custom gitignore parser with `git check-ignore --stdin` (the authoritative source), with the parser as a fallback when git is unavailable
- Fix `scan` falsely reporting localhost connection strings (e.g. `Host=localhost; Port=5432; ...`) as secret leaks — these are now treated as placeholder/example values

## [1.8.0] - 2026-06-03

- Unify config and secret files under one `RepoFile` model with a `kind` discriminator (`CONFIG` | `SECRET`), replacing the separate config-file/secret-file uploaders and pullers
- `push`: infer the owning App (nearest project-marker walk via `AppRootResolver`) and environment slug (filename pattern via `EnvSlugResolver`) automatically; show a manifest table before encrypting and prompt for confirmation
- `pull`: restore files byte-faithful to their repo-relative paths; show a restore manifest before decryption
- REPL: simplified line editor, status footer showing cwd/repo/project/vault lock, and interactive `config` command; removed tab autocompletion
- Drop the legacy `env` and `secrets` list commands (superseded by the unified file model)
- Clean-architecture refactor: injectable `IRepositoryLocator`, `IProjectContextResolver`, `IErrorHandler`, and `IFileArgResolver`; folders reorganized to match the static-vs-DI convention

## [1.7.0] - 2026-06-01

- Encrypt secret files client-side on `push` and upload as JSON — fixes 400 errors and closes a zero-knowledge plaintext leak
- `push`: aggregate stale-variable detection per vault to stop false "delete stale" prompts on first push
- `push`: map directories to vaults by path + name only (drop greedy tag-match that merged unrelated folders)
- `pull`: preserve blank lines between comment groups so `.env` files round-trip faithfully
- Cancel selection and multi-select prompts on Esc; pre-select all choices by default (`push` selects all discovered files — deselect to skip)
- Stale-variable deletion now defaults to No and is skipped in non-interactive mode
- `auth`: clear vault keys on logout and give clearer locked-vault guidance
- Update package references to latest versions

## [1.6.0] - 2026-04-22

- Flatten vault model: drop the vault-group / environment abstraction so each vault is a single flat keyset, and retarget pull/push to a vault directly instead of selecting a group + environment
- Replace the old `FileEnvironmentAssigner` / `DirectoryVaultGroupMapper` flow with a new directory-to-vault mapper that infers file-to-vault assignments from the directory structure on `push`
- Suggest tags on `push` via `TagSuggester` to help categorize imported variables
- Regenerate the Kiota API client against the flattened backend OpenAPI spec

## [1.5.6] - 2026-04-19

- Verify the derived KEK on `depvault unlock` and pull/push flows — a wrong vault password now fails immediately instead of silently producing a junk KEK that could corrupt new SELF grants
- Detect vault-salt rotation and invalidate the cached KEK when the vault password was changed from another client, re-prompting for the new password
- Add unit test suite covering CLI crypto primitives (AES-256-GCM, PBKDF2, HKDF), vault state lifecycle, and cross-platform interop vectors

## [1.5.5] - 2026-04-19

- Refactor env file parsing/serialization utilities and add unit test project for CLI

## [1.5.4] - 2026-04-19

- Initial tracked release.
