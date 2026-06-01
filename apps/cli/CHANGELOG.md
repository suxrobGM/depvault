# Changelog

All notable changes to the DepVault CLI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
