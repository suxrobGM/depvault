---
name: release-cli
description: Bump version, update changelog, commit, and tag a new DepVault CLI release
user-invocable: true
---

# Release CLI Skill

Create a new DepVault CLI release by bumping the version, adding a CHANGELOG
entry, committing, and creating a git tag that triggers the `Release CLI`
workflow.

## Usage

The user provides a version number (e.g. `1.6.0`) or a bump type (`major`,
`minor`, `patch`). If no argument is given, default to a `patch` bump.

## Context

- **Version source of truth:** `apps/cli/DepVault.Cli.csproj` — the `<Version>` element
- **Changelog:** `apps/cli/CHANGELOG.md` — Keep a Changelog format, newest on top
- **Tag format:** `cli/vX.Y.Z` (matches `.github/workflows/release-cli.yml` trigger `cli/v*`)
- **Release body:** the workflow extracts the matching `## [X.Y.Z]` section from
  `apps/cli/CHANGELOG.md` and uses it as the GitHub Release body. If no section
  exists for the tag's version, the release job fails — so the changelog entry
  is not optional.
- **Build:** the workflow runs Native AOT publish for `linux-x64`, `osx-x64`,
  `osx-arm64`, `win-x64` and attaches archives to the GitHub Release

## Steps

1. **Determine the new version:**
   - Read the current version from `apps/cli/DepVault.Cli.csproj` (the `<Version>` element)
   - If the user provided a specific version (e.g. `1.6.0`), use it
   - If the user provided a bump type (`major`, `minor`, `patch`), calculate from current
   - If no argument was given, bump the patch version
   - Verify the new version is strictly greater than the current version

2. **Pre-flight checks:**
   - Confirm the working tree is clean (`git status` reports no changes)
   - Confirm the current branch is `main` (or ask the user if on another branch)
   - Confirm no existing tag `cli/vX.Y.Z` already exists (`git tag -l`)
   - If any check fails, stop and report — do not try to paper over the issue

3. **Bump version:**
   - Replace `<Version>CURRENT</Version>` with `<Version>NEW</Version>` in
     `apps/cli/DepVault.Cli.csproj`

4. **Update `apps/cli/CHANGELOG.md`:**
   - Read the existing file
   - Ask the user what changes to include in this release (or confirm entries
     they've already drafted)
   - Insert a new section at the top (above any existing version sections) in
     the form:

     ```
     ## [X.Y.Z] - YYYY-MM-DD

     - Bullet 1
     - Bullet 2
     ```

   - Use today's date in `YYYY-MM-DD`
   - Do NOT modify or remove existing entries
   - The new section must be non-empty — the release workflow will fail without it

5. **Commit the changes:**
   - Stage `apps/cli/DepVault.Cli.csproj` and `apps/cli/CHANGELOG.md`
   - Commit with message: `chore(cli): release vX.Y.Z`

6. **Create an annotated tag:**
   - `git tag -a cli/vX.Y.Z -m "DepVault CLI vX.Y.Z"`

7. **Report the result:**
   - Show the new version, the CHANGELOG bullets, and the tag name
   - Remind the user to run `git push && git push origin cli/vX.Y.Z` to trigger
     the `Release CLI` workflow, which will publish the GitHub Release with
     the CHANGELOG section as the body and AOT binaries for all four RIDs

## Do NOT

- Do not push to the remote — the user pushes when they're ready
- Do not use `--no-verify` or `--no-gpg-sign` if hooks fail — report the failure instead
- Do not amend a previous commit to roll the version — always create a new commit
- Do not leave the new CHANGELOG section empty — the release workflow requires content
