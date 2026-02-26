# Before/after comparison: database schema with and without rules

## Methodology

**Feature tested:** Database schema - core models for DepVault (User, Project, ProjectMember, Analysis, Dependency, Vulnerability)

**Why this feature:** The database schema touches multiple CLAUDE.md conventions (UUID primary keys, timestamps on all models, soft deletes, multi-file Prisma schema, pg adapter, proper enums). It's self-contained and produces clear, comparable output.

**Prompt used (identical for both tests):**

> "Create the Prisma database schema for DepVault with models for users, projects, project members, analyses, dependencies, and vulnerabilities."

**Conditions:**

- **Before:** Fresh chat session with CLAUDE.md removed. Only the prompt above was provided - no architecture guidance.
- **After:** Fresh chat session with the full CLAUDE.md active (database conventions, model rules, file patterns, backend architecture).

---

## Before: schema generated without rules

With no rules file, the AI produced a single `schema.prisma` file with auto-increment integer IDs and inconsistent conventions:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  username  String   @unique
  password  String
  avatar    String?
  githubId  String?  @unique
  verified  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects       Project[]
  projectMembers ProjectMember[]
}

model Project {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  userId      Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user     User            @relation(fields: [userId], references: [id])
  members  ProjectMember[]
  analyses Analysis[]
}

model ProjectMember {
  id        Int      @id @default(autoincrement())
  role      String   @default("viewer")
  userId    Int
  projectId Int
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  project Project @relation(fields: [projectId], references: [id])

  @@unique([userId, projectId])
}

model Analysis {
  id        Int      @id @default(autoincrement())
  fileName  String
  ecosystem String
  status    String   @default("pending")
  projectId Int
  createdAt DateTime @default(now())

  project      Project      @relation(fields: [projectId], references: [id])
  dependencies Dependency[]
}

model Dependency {
  id             Int      @id @default(autoincrement())
  name           String
  currentVersion String
  latestVersion  String?
  status         String   @default("unknown")
  license        String?
  analysisId     Int
  createdAt      DateTime @default(now())

  analysis        Analysis        @relation(fields: [analysisId], references: [id])
  vulnerabilities Vulnerability[]
}

model Vulnerability {
  id           Int      @id @default(autoincrement())
  cveId        String
  severity     String
  description  String?
  dependencyId Int
  createdAt    DateTime @default(now())

  dependency Dependency @relation(fields: [dependencyId], references: [id])
}
```

### Issues in the "before" output

1. Auto-increment integer IDs instead of UUID
2. Single schema file instead of multi-file organization
3. No pg adapter configuration
4. String literals for enums (`role: String @default("viewer")`, `status: String`) instead of Prisma enums
5. Missing `updatedAt` on ProjectMember, Analysis, Dependency, and Vulnerability
6. No soft deletes - User model missing `deletedAt DateTime?`
7. Password field named `password` instead of `passwordHash` (implies storing plaintext)
8. No cascade delete rules on relations
9. Foreign key uses generic `userId` instead of `ownerId` for Project owner
10. Missing `emailVerified` boolean - uses generic `verified` instead

---

## After: schema generated with rules

With CLAUDE.md active, the AI produced a multi-file schema following project conventions:

**`apps/backend/prisma/schema/schema.prisma`**

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**`apps/backend/prisma/schema/user.prisma`**

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String    @unique
  passwordHash  String?
  avatarUrl     String?
  emailVerified Boolean   @default(false)
  githubId      String?   @unique
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  ownedProjects Project[]       @relation("ProjectOwner")
  memberships   ProjectMember[]
}
```

**`apps/backend/prisma/schema/project.prisma`**

```prisma
enum Role {
  OWNER
  EDITOR
  VIEWER
}

model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner    User            @relation("ProjectOwner", fields: [ownerId], references: [id])
  members  ProjectMember[]
  analyses Analysis[]
}

model ProjectMember {
  id        String   @id @default(uuid())
  projectId String
  userId    String
  role      Role     @default(VIEWER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])

  @@unique([projectId, userId])
}
```

**`apps/backend/prisma/schema/analysis.prisma`**

```prisma
enum AnalysisStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum DependencyStatus {
  UP_TO_DATE
  MINOR_UPDATE
  MAJOR_UPDATE
  DEPRECATED
}

enum Severity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model Analysis {
  id        String         @id @default(uuid())
  projectId String
  ecosystem String
  fileName  String
  status    AnalysisStatus @default(PENDING)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  dependencies Dependency[]
}

model Dependency {
  id             String           @id @default(uuid())
  analysisId     String
  name           String
  currentVersion String
  latestVersion  String?
  status         DependencyStatus @default(UP_TO_DATE)
  license        String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  analysis        Analysis        @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  vulnerabilities Vulnerability[]
}

model Vulnerability {
  id           String   @id @default(uuid())
  dependencyId String
  cveId        String
  severity     Severity
  description  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  dependency Dependency @relation(fields: [dependencyId], references: [id], onDelete: Cascade)
}
```

---

## Comparison

| Aspect                   | Before (no rules)                         | After (with rules)                                         | Correct? |
| ------------------------ | ----------------------------------------- | ---------------------------------------------------------- | -------- |
| Primary keys             | `Int @id @default(autoincrement())`       | `String @id @default(uuid())`                              | After    |
| Timestamps (`createdAt`) | Present on all models                     | Present on all models                                      | Both     |
| Timestamps (`updatedAt`) | Missing on 4 of 6 models                  | Present on all 6 models                                    | After    |
| Soft deletes             | Missing entirely                          | `deletedAt DateTime?` on User                              | After    |
| Schema structure         | Single `schema.prisma` file               | Multi-file in `prisma/schema/`                             | After    |
| Driver adapter           | Not configured                            | `previewFeatures = ["driverAdapters"]`                     | After    |
| Enum types               | String literals (`"viewer"`, `"pending"`) | Proper Prisma enums (`Role`, `AnalysisStatus`, `Severity`) | After    |
| Password field           | `password String` (implies plaintext)     | `passwordHash String?` (clearly hashed)                    | After    |
| Owner relation           | Generic `userId` FK                       | Semantic `ownerId` with named relation                     | After    |
| Cascade deletes          | Not specified                             | `onDelete: Cascade` on child relations                     | After    |
| Email verification       | `verified Boolean` (generic)              | `emailVerified Boolean` (specific)                         | After    |
| Generator config         | Basic `prisma-client-js`                  | Includes `driverAdapters` preview feature                  | After    |

**Conventions followed (before):** 3 out of 12 (25%)
**Conventions followed (after):** 12 out of 12 (100%)

---

## What the comparison shows

The rules file did exactly what you'd expect: it made the AI follow project conventions instead of guessing.

Without CLAUDE.md, the output was generic. Auto-increment IDs, no enums, missing timestamps on half the models. It's the kind of schema you'd get from a "Prisma tutorial" blog post. It works, but it doesn't match how this project actually does things.

With CLAUDE.md, the output matched project conventions on every point. Multi-file schema, UUIDs, soft deletes on User, proper enums, cascade deletes, `passwordHash` instead of `password`. None of these are things an AI would infer from a one-line prompt - they're decisions that were already made and written down.

A few things worth calling out:

**Auto-increment IDs leak information.** Sequential IDs tell anyone with API access how many records exist and roughly when they were created. UUIDs don't. This is a security decision, not a style preference, and it only happened because CLAUDE.md said to use UUIDs.

**String-typed enums are bugs waiting to happen.** The "before" schema stores roles as `String @default("viewer")`. Nothing stops a typo like `"viwer"` from getting into the database. Prisma enums catch that at compile time.

**`password` vs `passwordHash` matters more than it looks.** The field name signals intent. A developer seeing `password: String` might reasonably assume it stores the raw password. `passwordHash` makes it obvious that hashing is expected. One convention, applied once in a rules file, prevents a class of mistakes.

The rules file isn't doing anything clever. It's a persistent specification - project decisions that would otherwise get lost between sessions. The AI follows what it's told. The difference is whether you tell it.
