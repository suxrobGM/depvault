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
| | 9 config files    | | 18 config files   | | 4 cfg files | |
| |                   | |                   | |             | |
| | Updated 2h ago    | | Updated 1d ago    | | Updated 5m  | |
| +-------------------+ +-------------------+ +-------------+ |
|                                                             |
+-------------------------------------------------------------+

Cards use MUI Card. Health bar is a LinearProgress.
Grid layout: 3 columns on desktop, 2 on tablet, 1 on mobile.
```

---

## Project detail (tabbed view)

```text
+--[ Shell ]--------------------------------------------------+
| < Back    my-api                     [Settings] [Members]   |
|-------------------------------------------------------------|
| [ Overview ]  [ Analysis ]  [ Repo ]  [ Secrets ]           |
|=============================================================|
|                                                             |
| OVERVIEW TAB:                                               |
|                                                             |
| Health Score              Quick Stats                       |
| +------------------+     +-----------------------------+    |
| |                  |     | Dependencies:  142           |    |
| |    87 / 100      |     | Vulnerabilities: 3 (1 high) |    |
| |   [circular]     |     | Outdated: 8                  |    |
| |                  |     | Apps: 3                      |    |
| +------------------+     | Config files: 9              |    |
|                          | Environments: base,dev,prod  |    |
|                          +-----------------------------+    |
|                                                             |
| Recent Activity                                             |
| +-------------------------------------------------------+  |
| | 2h ago  - Analysis ran on package.json (3 new vulns)  |  |
| | 1d ago  - appsettings.Production.json saved (api)     |  |
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
| [ Overview ]  [*Analysis*]  [ Repo ]  [ Secrets ]           |
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

## Repo browser tab

The Repo tab is a two-pane browser: the left pane lists apps grouped by path with an
environment selector; the right pane shows the selected app's config files (in a Form/Raw
editor) and secret files for that environment.

```text
+--[ Shell ]--------------------------------------------------+
| my-api > Repo                                               |
|-------------------------------------------------------------|
| [ Overview ]  [ Analysis ]  [*Repo*]  [ Secrets ]           |
|=============================================================|
| Environment: [ prod v ]   (base / dev / prod / staging ...) |
|------------------+------------------------------------------|
| APPS             | api  >  appsettings.Production.json      |
|                  |------------------------------------------|
| > / (root)       | [ Form ] [*Raw*]   [History] [Download]  |
| > api    (3)     |                                          |
|   . appsettings  | +--------------------------------------+ |
|   . appsettings  | | {                                    | |
|   . .env.prod    | |   "ConnectionStrings": {             | |
| > web    (4)     | |     "Default": "Server=db;..."       | |
|   . .env         | |   },                                 | |
|   . .env.prod    | |   "Jwt": { "Issuer": "depvault" }    | |
|                  | | }                                    | |
| SECRET FILES     | +--------------------------------------+ |
|   . api/tls.pfx  |                                          | |
|   . web/gsa.json |              [ Discard ]  [ Save ]       |
+------------------+------------------------------------------+

Left pane: apps grouped by appPath; (n) = config file count for the env.
Right pane: a config file opened in the Raw (CodeMirror) editor.
Binary secret files (tls.pfx) are download-only — no editor.
```

Form view of the same file (key/value table, used for .env-style files):

```text
+------------------------------------------+----------------+
| api  >  .env.prod    [*Form*] [ Raw ]    | [History]      |
|----------------------------------------------------------|
| Show values: [ ] (toggle)                                |
|                                                          |
| +--------------+--------------------------+-----------+   |
| | Key          | Value                    | Acts      |   |
| +--------------+--------------------------+-----------+   |
| | DATABASE_URL | ************************ | [reveal]  |   |
| | JWT_SECRET   | ************************ | [reveal]  |   |
| | PORT         | 4000                     | [reveal]  |   |
| | CORS_ORIGINS | ************************ | [reveal]  |   |
| +--------------+--------------------------+-----------+   |
| [ + Add row ]                                            |
|                                  [ Discard ]  [ Save ]   |
+----------------------------------------------------------+

The whole file is one encrypted blob. The Form editor parses it client-side
into rows; Save re-serializes, re-encrypts, and PUTs a new blob (snapshotting
the prior version). Values masked by default; reveal decrypts in-memory only.
```

---

## Version history + diff view

Opened from the [History] button on any config/secret file. Pick two versions to see a
git-style line diff, computed client-side after both blobs are decrypted.

```text
+--[ Shell ]--------------------------------------------------+
| my-api > Repo > api/.env.prod > History                     |
|-------------------------------------------------------------|
| Versions                  Diff:  [v3 (now) v]  vs  [v2 v]   |
| +----------------------+ +---------------------------------+ |
| | * v3  now   @you     | |   DATABASE_URL=postgres://db... | |
| |   v2  2d    @alice   | | - PORT=8080                     | |
| |   v1  9d    @you     | | + PORT=4000                     | |
| |                      | |   CORS_ORIGINS=app.depvault.com | |
| | [ Restore selected ] | | + SENTRY_DSN=https://...        | |
| +----------------------+ +---------------------------------+ |
|                                                             |
| Removed lines red (-), added lines green (+), context grey. |
| [ Restore selected ] replaces current content with that     |
| version (saving current as a new version first).            |
+-------------------------------------------------------------+
```

---

## New app / push hint

Apps are created automatically when you `depvault push` a file (the owning app is inferred
from the nearest project marker). You can also create one manually from the Repo tab.

```text
+-----------------------------------------------+
| New app                               [x]     |
|-----------------------------------------------|
|                                               |
| Display name                                  |
| [api___________________________________]      |
|                                               |
| App path (repo-relative)                      |
| [apps/api______________________________]      |
| Must be unique within the project.            |
|                                               |
|                        [ Cancel ] [ Create ]  |
+-----------------------------------------------+

Most users never open this — pushing from the CLI creates apps on the fly.
```

---

## Secret sharing

```text
+--[ Shell ]--------------------------------------------------+
| my-api > Secrets                                            |
|-------------------------------------------------------------|
| [ Overview ]  [ Analysis ]  [ Repo ]  [*Secrets*]           |
|=============================================================|
|                                                             |
| [ + Generate Share Link ]                                   |
|                                                             |
| Active links:                                               |
| +--+------------+----------------+--------+--------+------+  |
| |  | Created    | File           | Expires| Status | Acts |  |
| +--+------------+----------------+--------+--------+------+  |
| |  | 2h ago     | api/.env.prod  | 22h    | Pending| [Copy]| |
| |  | 1d ago     | api/tls.pfx    | --     | Viewed | --   |  |
| |  | 5d ago     | web/.env.prod  | --     | Expired| --   |  |
| +--+------------+----------------+--------+--------+------+  |
|                                                             |
+-------------------------------------------------------------+

Generate dialog (launched from a config or secret file):
+-----------------------------------------------+
| Share file                            [x]     |
|-----------------------------------------------|
|                                               |
| Sharing:  api/.env.prod  (config file)        |
|                                               |
| Password protect: [ ] (optional)              |
| Password: [____________________]              |
|                                               |
| Expires in: [24 hours v]                      |
| (1h / 24h / 7d / Custom)                     |
|                                               |
|                  [ Cancel ] [ Generate Link ]  |
+-----------------------------------------------+

After generation (decryption key lives only in the URL #fragment):
+-----------------------------------------------+
| Link generated                        [x]     |
|-----------------------------------------------|
|                                               |
| https://depvault.com/s/a8f3k2...#key=...  [Copy]|
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
| [~] api/.env.prod not updated in 95d     |
|     my-api - 1 day ago                    |
|------------------------------------------|
| [i] CI token for api/prod expires soon   |
|     my-api - 3 days ago                  |
|------------------------------------------|
| [+] alice@email.com joined as editor     |
|     my-api - 5 days ago                  |
|------------------------------------------|
|              [ View all notifications ]  |
+------------------------------------------+

Icons: [!] = vulnerability, [~] = stale file, [i] = CI token, [+] = team
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

Side-by-side layout using Grid. Source is editable textarea,
output is read-only with syntax highlighting.
```
