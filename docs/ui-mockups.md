# UI mockups

---

## App shell

Every authenticated page shares this shell. Sidebar collapses to icons on mobile.

```text
+--[ DepVault ]----------------------------------------------+
| [=] DepVault               Search... [___________] [A] [N] |
+--------+----------------------------------------------------+
|        |                                                    |
| SIDE   |  CONTENT AREA                                      |
| BAR    |                                                    |
|        |  (page-specific content rendered here)             |
|--------|                                                    |
| Dash   |                                                    |
| Projts |                                                    |
| ----   |                                                    |
| Settngs|                                                    |
|        |                                                    |
+--------+----------------------------------------------------+

[A] = Avatar/profile menu    [N] = Notification bell with badge
Sidebar items: Dashboard, Projects, Settings
```

---

## Login page

```text
+--------------------------------------------------------------+
|                                                              |
|                       [ DepVault logo ]                      |
|                                                              |
|                   +------------------------+                 |
|                   | Sign in                |                 |
|                   |                        |                 |
|                   | Email                  |                 |
|                   | [____________________] |                 |
|                   |                        |                 |
|                   | Password               |                 |
|                   | [____________________] |                 |
|                   |                        |                 |
|                   | [ Forgot password? ]   |                 |
|                   |                        |                 |
|                   | [    Sign in     ]     |                 |
|                   |                        |                 |
|                   | -------- or --------   |                 |
|                   |                        |                 |
|                   | [ Sign in with GitHub] |                 |
|                   |                        |                 |
|                   | Don't have an account? |                 |
|                   | [ Register ]           |                 |
|                   +------------------------+                 |
|                                                              |
+--------------------------------------------------------------+
```

---

## Register page

```text
+--------------------------------------------------------------+
|                                                              |
|                       [ DepVault logo ]                      |
|                                                              |
|                   +------------------------+                 |
|                   | Create account         |                 |
|                   |                        |                 |
|                   | Username               |                 |
|                   | [____________________] |                 |
|                   |                        |                 |
|                   | Email                  |                 |
|                   | [____________________] |                 |
|                   |                        |                 |
|                   | Password               |                 |
|                   | [____________________] |                 |
|                   | 8+ chars, 1 upper, 1 # |                 |
|                   |                        |                 |
|                   | Confirm password       |                 |
|                   | [____________________] |                 |
|                   |                        |                 |
|                   | [   Create account  ]  |                 |
|                   |                        |                 |
|                   | -------- or --------   |                 |
|                   |                        |                 |
|                   | [ Sign up with GitHub] |                 |
|                   |                        |                 |
|                   | Already have account?  |                 |
|                   | [ Sign in ]            |                 |
|                   +------------------------+                 |
|                                                              |
+--------------------------------------------------------------+
```

---

## Dashboard (project list)

```text
+--[ Shell ]--------------------------------------------------+
| Dashboard                          [ + New Project ]        |
|-------------------------------------------------------------|
| Sort: [Health v]  Filter: [All v]   Search: [___________]   |
|-------------------------------------------------------------|
|                                                             |
| +-------------------+ +-------------------+ +-------------+ |
| | my-api            | | frontend-app      | | infra-tools | |
| | Node.js           | | Node.js + Python  | | Go + Rust   | |
| |                   | |                   | |             | |
| | Health: 87/100    | | Health: 62/100    | | Health: 94  | |
| | [====----]  Good  | | [===-----] Warn   | | [=====] OK  | |
| |                   | |                   | |             | |
| | 3 vulnerabilities | | 12 vulnerabilities| | 0 vulns     | |
| | 8 outdated        | | 24 outdated       | | 2 outdated  | |
| | 15 env vars       | | 42 env vars       | | 8 env vars  | |
| |                   | |                   | |             | |
| | Updated 2h ago    | | Updated 1d ago    | | Updated 5m  | |
| +-------------------+ +-------------------+ +-------------+ |
|                                                             |
+-------------------------------------------------------------+

Cards use MUI Card. Health bar is a LinearProgress.
Grid2 layout: 3 columns on desktop, 2 on tablet, 1 on mobile.
```

---

## Project detail (tabbed view)

```text
+--[ Shell ]--------------------------------------------------+
| < Back    my-api                     [Settings] [Members]   |
|-------------------------------------------------------------|
| [ Overview ]  [ Analysis ]  [ Env Vault ]  [ Secrets ]      |
|=============================================================|
|                                                             |
| OVERVIEW TAB:                                               |
|                                                             |
| Health Score              Quick Stats                       |
| +------------------+     +-----------------------------+    |
| |                  |     | Dependencies:  142           |    |
| |    87 / 100      |     | Vulnerabilities: 3 (1 high) |    |
| |   [circular]     |     | Outdated: 8                  |    |
| |                  |     | Env variables: 15            |    |
| +------------------+     | Environments: 3              |    |
|                          +-----------------------------+    |
|                                                             |
| Recent Activity                                             |
| +-------------------------------------------------------+  |
| | 2h ago  - Analysis ran on package.json (3 new vulns)  |  |
| | 1d ago  - DB_PASSWORD rotated in production           |  |
| | 3d ago  - @alice invited as editor                    |  |
| +-------------------------------------------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

---

## Analysis tab

```text
+--[ Shell ]--------------------------------------------------+
| my-api > Analysis                                           |
|-------------------------------------------------------------|
| [ Overview ]  [*Analysis*]  [ Env Vault ]  [ Secrets ]      |
|=============================================================|
|                                                             |
| Upload: [ Drop file or click ] [paste]   Ecosystem: auto   |
|                                                             |
| Last analysis: package.json (2h ago)     [ Re-analyze ]     |
|-------------------------------------------------------------|
|                                                             |
| Search: [___________]  Severity: [All v]  Status: [All v]  |
|                                                             |
| +---+------------+----------+--------+--------+----------+ |
| |   | Package    | Current  | Latest | Status | Vulns    | |
| +---+------------+----------+--------+--------+----------+ |
| |   | express    | 4.18.2   | 4.21.0 | MAJOR  |          | |
| | ! | lodash     | 4.17.20  | 4.17.21| MINOR  | 1 HIGH   | |
| |   | typescript | 5.3.3    | 5.9.3  | MAJOR  |          | |
| | ! | axios      | 1.6.0   | 1.7.9  | MINOR  | 2 MED    | |
| |   | prisma     | 5.22.0  | 7.4.1  | MAJOR  |          | |
| |   | zod        | 3.22.4  | 3.24.0 | MINOR  |          | |
| +---+------------+----------+--------+--------+----------+ |
|                                                             |
| Showing 1-6 of 142          [ < ]  1  2  3 ... 24  [ > ]   |
|                                                             |
+-------------------------------------------------------------+

! = vulnerability indicator (colored chip)
Status column: color-coded chips (green/yellow/orange/red)
Table: MUI DataGrid with sorting, filtering, pagination.
```

---

## Dependency tree visualization

```text
+--[ Shell ]--------------------------------------------------+
| my-api > Analysis > Dependency Tree                         |
|-------------------------------------------------------------|
|                                                             |
| Search: [___________]   Zoom: [-] [+]   [ Collapse all ]   |
|                                                             |
|  express@4.18.2                                             |
|  +-- body-parser@1.20.2                                     |
|  |   +-- bytes@3.1.2                                        |
|  |   +-- content-type@1.0.5                                 |
|  |   +-- depd@2.0.0                                         |
|  +-- cookie@0.6.0                                           |
|  +-- debug@2.6.9                                            |
|  |   +-- ms@2.0.0                                           |
|  +-- finalhandler@1.2.0                                     |
|  +-- [!] path-to-regexp@0.1.7  ---- CVE-2024-45296 HIGH    |
|                                                             |
|  +-----------------------------------------------+         |
|  | path-to-regexp@0.1.7          [x]             |         |
|  |                                                |         |
|  | License: MIT                                   |         |
|  | Vulnerability: CVE-2024-45296 (HIGH)           |         |
|  | Fixed in: 0.1.12                               |         |
|  | Changelog: github.com/...                      |         |
|  +-----------------------------------------------+         |
|                                                             |
+-------------------------------------------------------------+

Nodes are color-coded: green (ok), yellow (outdated), red (vulnerable).
Click a node to open the detail panel on the right.
```

---

## Env vault tab

```text
+--[ Shell ]--------------------------------------------------+
| my-api > Env Vault                                          |
|-------------------------------------------------------------|
| [ Overview ]  [ Analysis ]  [*Env Vault*]  [ Secrets ]      |
|=============================================================|
|                                                             |
| Environment: [Development v]  [+ Add Variable]  [Import]   |
|                                        [Export]  [Diff]     |
|                                                             |
| Search: [___________]    Show values: [ ] (toggle)          |
|                                                             |
| +---+--------------+--------------+------+-------+-------+ |
| |   | Key          | Value        | Req? | Age   | Acts  | |
| +---+--------------+--------------+------+-------+-------+ |
| |   | DATABASE_URL | ************ | Yes  | 12d   | [E][D]| |
| | ! | JWT_SECRET   | ************ | Yes  | 95d   | [E][D]| |
| |   | PORT         | 4000         | No   |  2d   | [E][D]| |
| |   | CORS_ORIGINS | ************ | No   | 30d   | [E][D]| |
| | ! | API_KEY      | ************ | Yes  | 120d  | [E][D]| |
| +---+--------------+--------------+------+-------+-------+ |
|                                                             |
| ! = rotation overdue (red age indicator)                    |
| [E] = edit   [D] = delete                                  |
|                                                             |
+-------------------------------------------------------------+

Values masked by default. Toggle reveals decrypted values.
Age column: green (<30d), yellow (30-90d), red (>90d).
```

---

## Environment diff view

```text
+--[ Shell ]--------------------------------------------------+
| my-api > Env Vault > Diff                                   |
|-------------------------------------------------------------|
|                                                             |
| Compare: [Development v]  vs  [Staging v]  vs  [Prod v]    |
|                                                             |
| [ Export diff as CSV ]  [ Export diff as Markdown ]          |
|                                                             |
| +--------------+---------------+-----------+--------------+ |
| | Key          | Development   | Staging   | Production   | |
| +--------------+---------------+-----------+--------------+ |
| | DATABASE_URL | postgres://.. | postgres..| postgres://..| |
| | JWT_SECRET   | dev-secret-.. | stg-secr..| prod-secr....| |
| | PORT         | 4000          | 4000      | 4000         | |
| | CORS_ORIGINS | localhost:4001| staging.. | app.depv..   | |
| | SENTRY_DSN   | --MISSING--   | https://..| https://..   | |
| | DEBUG        | true          | false     | --MISSING--  | |
| +--------------+---------------+-----------+--------------+ |
|                                                             |
| --MISSING-- cells are highlighted red.                      |
| Differing values across envs are highlighted yellow.        |
| Identical values have no highlight.                         |
|                                                             |
+-------------------------------------------------------------+
```

---

## Add/edit variable dialog

```text
+-----------------------------------------------+
| Add environment variable              [x]     |
|-----------------------------------------------|
|                                               |
| Key                                           |
| [____________________________________]        |
|                                               |
| Value                                         |
| [____________________________________]        |
|                                               |
| Description (optional)                        |
| [____________________________________]        |
|                                               |
| Validation rule (optional)                    |
| [____________________________________]        |
| e.g. "url", "email", "number"                |
|                                               |
| [ ] Required for local setup                  |
|                                               |
| Rotation policy                               |
| [None v]  (None / 30d / 60d / 90d / Custom)  |
|                                               |
|                        [ Cancel ] [ Save ]    |
+-----------------------------------------------+

MUI Dialog with TextField inputs.
Checkbox for isRequired flag.
Select for rotation policy.
```

---

## Secret sharing

```text
+--[ Shell ]--------------------------------------------------+
| my-api > Secrets                                            |
|-------------------------------------------------------------|
| [ Overview ]  [ Analysis ]  [ Env Vault ]  [*Secrets*]      |
|=============================================================|
|                                                             |
| [ + Generate Share Link ]                                   |
|                                                             |
| Active links:                                               |
| +--+------------+----------+--------+--------+----------+  |
| |  | Created    | Variables| Expires| Status | Actions  |  |
| +--+------------+----------+--------+--------+----------+  |
| |  | 2h ago     | 3 vars   | 22h    | Pending| [Copy]   |  |
| |  | 1d ago     | 1 var    | --     | Viewed | --       |  |
| |  | 5d ago     | 5 vars   | --     | Expired| --       |  |
| +--+------------+----------+--------+--------+----------+  |
|                                                             |
+-------------------------------------------------------------+

Generate dialog:
+-----------------------------------------------+
| Share secrets                         [x]     |
|-----------------------------------------------|
|                                               |
| Select variables to share:                    |
| [x] DATABASE_URL                              |
| [x] JWT_SECRET                                |
| [ ] PORT                                      |
| [x] API_KEY                                   |
|                                               |
| Password protect: [ ] (optional)              |
| Password: [____________________]              |
|                                               |
| Expires in: [24 hours v]                      |
| (1h / 24h / 7d / Custom)                     |
|                                               |
|                  [ Cancel ] [ Generate Link ]  |
+-----------------------------------------------+

After generation:
+-----------------------------------------------+
| Link generated                        [x]     |
|-----------------------------------------------|
|                                               |
| https://depvault.app/s/a8f3k2...     [Copy]  |
|                                               |
| This link can only be viewed once.            |
| It expires in 24 hours.                       |
|                                               |
|                              [ Done ]          |
+-----------------------------------------------+
```

---

## Project settings

```text
+--[ Shell ]--------------------------------------------------+
| my-api > Settings                                           |
|-------------------------------------------------------------|
|                                                             |
| General                                                     |
| +-------------------------------------------------------+  |
| | Project name                                          |  |
| | [my-api_______________________________]               |  |
| |                                                       |  |
| | Description                                           |  |
| | [Backend API for the main application___]             |  |
| |                                                       |  |
| |                                     [ Save changes ]  |  |
| +-------------------------------------------------------+  |
|                                                             |
| License Policy                                              |
| +-------------------------------------------------------+  |
| | Default policy for new dependencies:                  |  |
| | ( ) Allow all    (x) Warn on restrictive   ( ) Strict |  |
| |                                                       |  |
| | Blocked licenses: [GPL, AGPL____________] [+ Add]     |  |
| +-------------------------------------------------------+  |
|                                                             |
| Danger Zone                                                 |
| +-------------------------------------------------------+  |
| | Transfer ownership    [ Transfer ]                    |  |
| | Delete project        [ Delete ]  (requires confirm)  |  |
| +-------------------------------------------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

---

## Members management

```text
+--[ Shell ]--------------------------------------------------+
| my-api > Members                                            |
|-------------------------------------------------------------|
|                                                             |
| [ + Invite Member ]                                         |
|                                                             |
| +--------+-----------------------+--------+----------+      |
| | Avatar | Member                | Role   | Actions  |      |
| +--------+-----------------------+--------+----------+      |
| | [img]  | you@email.com (You)   | Owner  |   --     |      |
| | [img]  | alice@email.com       | Editor | [v] [x]  |      |
| | [img]  | bob@email.com         | Viewer | [v] [x]  |      |
| +--------+-----------------------+--------+----------+      |
|                                                             |
| [v] = change role dropdown   [x] = remove member           |
|                                                             |
+-------------------------------------------------------------+

Invite dialog:
+-----------------------------------------------+
| Invite member                         [x]     |
|-----------------------------------------------|
|                                               |
| Email or GitHub username                      |
| [____________________________________]        |
|                                               |
| Role: [Editor v]  (Editor / Viewer)           |
|                                               |
|                 [ Cancel ] [ Send Invite ]     |
+-----------------------------------------------+
```

---

## Notification panel

```text
Triggered by clicking bell icon [N] in app bar.
Appears as a dropdown/popover anchored to the bell.

+------------------------------------------+
| Notifications               [Mark all]   |
|------------------------------------------|
| [!] HIGH vuln found in lodash            |
|     my-api - 2 hours ago                 |
|------------------------------------------|
| [~] JWT_SECRET rotation overdue          |
|     my-api - 1 day ago                   |
|------------------------------------------|
| [i] SENTRY_DSN missing in production     |
|     my-api - 3 days ago                  |
|------------------------------------------|
| [+] alice@email.com joined as editor     |
|     my-api - 5 days ago                  |
|------------------------------------------|
|              [ View all notifications ]  |
+------------------------------------------+

Icons: [!] = vulnerability, [~] = rotation, [i] = drift, [+] = team
Unread items have a colored left border.
```

---

## User profile / settings

```text
+--[ Shell ]--------------------------------------------------+
| Profile Settings                                            |
|-------------------------------------------------------------|
|                                                             |
| Avatar                                                      |
| +--------+                                                  |
| | [img]  |  [ Upload new ]                                  |
| +--------+                                                  |
|                                                             |
| Username                                                    |
| [johndoe________________________]                           |
|                                                             |
| Email                                                       |
| [john@example.com_______________]                           |
|                                                             |
|                                     [ Save changes ]        |
|                                                             |
| Linked Accounts                                             |
| +-------------------------------------------------------+  |
| | GitHub: connected as @johndoe    [ Unlink ]           |  |
| +-------------------------------------------------------+  |
|                                                             |
| Change Password                                             |
| +-------------------------------------------------------+  |
| | Current password  [____________________]              |  |
| | New password      [____________________]              |  |
| | Confirm password  [____________________]              |  |
| |                             [ Update password ]       |  |
| +-------------------------------------------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

---

## Format converter

```text
+--[ Shell ]--------------------------------------------------+
| Format Converter                                            |
|-------------------------------------------------------------|
|                                                             |
| Source format: [.env v]     Target format: [appsettings v]  |
|                                                             |
| Input:                         Output (preview):            |
| +-------------------------+   +---------------------------+ |
| | DATABASE_URL=postgres://|   | {                         | |
| | JWT_SECRET=mysecret     |   |   "Database": {           | |
| | PORT=4000               |   |     "Url": "postgres://"  | |
| | DEBUG=true              |   |   },                      | |
| |                         |   |   "Jwt": {                | |
| |                         |   |     "Secret": "mysecret"  | |
| |                         |   |   },                      | |
| |                         |   |   "Port": 4000,           | |
| |                         |   |   "Debug": true           | |
| |                         |   | }                         | |
| +-------------------------+   +---------------------------+ |
|                                                             |
|        [ Paste / Upload ]              [ Download ]         |
|                                                             |
+-------------------------------------------------------------+

Side-by-side layout using Grid2. Source is editable textarea,
output is read-only with syntax highlighting.
```
