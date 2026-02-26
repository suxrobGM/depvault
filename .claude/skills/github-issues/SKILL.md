---
name: github-issues
description: "Create GitHub issues from user requirements, a PRD document, or conversation context, and add them to a GitHub Project with priority, size, and type fields."
argument-hint: "[source-file-path] [--project <number>]"
---

# GitHub Issues

Create well-structured GitHub issues from any input — a PRD document, a requirements description in chat, feature ideas, or a task breakdown — then add them to a GitHub Project board with Priority, Size, and Type metadata.

## Input

The user may provide:

- A path to a document (PDF, Markdown, text) via `$ARGUMENTS`
- Requirements described directly in the conversation
- A mix of both

If `$ARGUMENTS` contains a file path, read that file. Otherwise, work from what the user described in chat. If no project number is given, detect it or ask.

## Step-by-step process

### 1. Understand the requirements

- If a file path is provided in `$ARGUMENTS`, read and analyze it
- If requirements are described in conversation, use that context
- Extract: features, user flows, screens, technical requirements, integrations
- Identify distinct work items that can each be assigned to one developer
- Ask clarifying questions if the scope is ambiguous

### 2. Detect repo and project context

Run these commands to understand the current GitHub setup:

```bash
gh repo view --json name,url,owner
gh label list
```

Detect the repo owner type (user vs organization) and find available projects:

```bash
gh project list --owner <org-or-user>
```

If a project number was provided in args, use it. Otherwise ask the user or auto-detect from the first available project.

### 3. Get project field configuration

Query project fields to find Priority, Size, Status, and their option IDs:

```bash
gh api graphql -f query='{
  <owner-type>(login: "<owner>") {
    projectV2(number: <N>) {
      id
      fields(first: 30) {
        nodes {
          ... on ProjectV2SingleSelectField {
            name
            id
            options { id name }
          }
        }
      }
    }
  }
}'
```

Also check for repo-level issue types:

```bash
gh api graphql -f query='{
  <owner-type>(login: "<owner>") {
    repository(name: "<repo>") {
      issueTypes(first: 20) {
        nodes { id name description isEnabled }
      }
    }
  }
}'
```

Store the field IDs and option IDs for later use. If fields like Priority or Size don't exist on the project, skip setting them and inform the user.

### 4. Plan the issues

Before creating anything, present the user with a summary table:

| #   | Title | Labels | Priority | Size | Type |
| --- | ----- | ------ | -------- | ---- | ---- |

Group issues by area (Backend, Web, Mobile, Database, Infra, Docs, etc.).

**Ask the user to confirm** before proceeding with creation. Let them adjust titles, priorities, sizes, or remove issues.

### 5. Create labels (if needed)

Check which labels already exist. Only create missing ones:

```bash
gh label create "<name>" -c "<color>" -d "<description>"
```

Suggest labels based on the project's tech stack and areas. Common examples:

- `backend`, `web`, `mobile`, `database`, `infra`, `docs`
- Any other project-specific labels

Do NOT create priority labels (P0/P1/P2) — use project fields instead.

### 6. Create issues

For each issue, use `gh issue create` with a heredoc body:

```bash
gh issue create --title "<title>" --label "<label1>,<label2>" --body "$(cat <<'EOF'
## Description
<clear description of what needs to be built>

## Requirements
<bullet list of specific requirements>

## Implementation notes
<relevant technical details, existing code to reuse, file paths>

## Files
<list of files to create or modify>
EOF
)"
```

Guidelines for issue content:

- Title: concise, action-oriented (e.g., "Student auth: OTP send & verify flow")
- Description: what to build, not how (leave implementation to the developer)
- Include relevant API endpoints, screen descriptions, or data models
- Reference existing code/files when applicable
- Keep each issue self-contained and assignable to one developer

### 7. Add issues to the project

After creating all issues, add them to the project:

```bash
gh project item-add <project-number> --owner <owner> --url <issue-url>
```

Collect the returned item IDs for field assignment in the next step.

### 8. Set project fields (Priority, Size, Type)

For each issue in the project, set the Priority and Size fields using the option IDs from step 3:

```bash
gh project item-edit --project-id <project-id> --id <item-id> \
  --field-id <priority-field-id> --single-select-option-id <option-id>
```

For issue types (Feature, Task, Bug), use the GraphQL mutation:

```bash
gh api graphql -f query='mutation($issueId:ID!,$typeId:ID!) {
  updateIssueIssueType(input:{issueId:$issueId,issueTypeId:$typeId}) {
    issue { number }
  }
}' -f issueId="<issue-node-id>" -f typeId="<type-id>"
```

If the `project` scope is missing for item-edit, inform the user to run `gh auth refresh -s project` and retry.

### 9. Verify and report

After all issues are created:

```bash
gh issue list --limit 100 --state open
```

Present a final summary to the user with:

- Total issues created, grouped by area
- Priority breakdown (P0/P1/P2 counts)
- Size breakdown (XS/S/M/L/XL counts)
- Link to the project board

## Issue sizing guide

| Size   | Scope                                                 |
| ------ | ----------------------------------------------------- |
| **XS** | Simple CRUD, single config, small copy change         |
| **S**  | One endpoint or one screen, straightforward logic     |
| **M**  | Multiple endpoints or screens, moderate complexity    |
| **L**  | Complex feature spanning multiple files/systems       |
| **XL** | Large cross-cutting feature, significant architecture |

## Priority guide

| Priority | Meaning                                  |
| -------- | ---------------------------------------- |
| **P0**   | Must-have for launch, blocks other work  |
| **P1**   | Important, build after P0 items are done |
| **P2**   | Nice to have, can ship without it        |

## Type assignment guide

| Type        | When to use                                                        |
| ----------- | ------------------------------------------------------------------ |
| **Feature** | New user-facing functionality, API endpoints, UI screens           |
| **Task**    | Setup, configuration, CI/CD, documentation, testing infrastructure |
| **Bug**     | Only if fixing existing broken behavior                            |

## Important notes

- Always ask the user to confirm the issue plan before creating
- Never create priority labels — use project fields instead
- Check for existing labels before creating new ones
- Use heredocs for issue bodies to preserve formatting
- Batch operations where possible for efficiency
- If the repo has no project, ask if the user wants issues only
- If `gh` auth scopes are insufficient, tell the user which scope to add
