import { prisma } from "@/common/database";
import { seedAdmin } from "./admin";

const seeders = {
  admin: { fn: seedAdmin, description: "Seed super admin user" },
} as const;

type SeederName = keyof typeof seeders;

function printHelp(): void {
  console.log("\nDatabase Seed Script\n");
  console.log("Usage: bun run db:seed [options]\n");
  console.log("Options:");
  console.log("  --help, -h          Show this help message");
  console.log("  --only <seeders>    Run only specified seeders (comma-separated)");
  console.log("  --list              List all available seeders\n");
  console.log("Examples:");
  console.log("  bun run db:seed                    # Run all seeders");
  console.log("  bun run db:seed --only admin       # Run only admin seeder");
}

function listSeeders(): void {
  console.log("\nAvailable seeders:\n");
  for (const [name, { description }] of Object.entries(seeders)) {
    console.log("  %-20s %s", name, description);
  }
  console.log();
}

function parseArgs(): SeederName[] | null {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--list")) {
    listSeeders();
    process.exit(0);
  }

  const onlyIndex = args.indexOf("--only");
  if (onlyIndex === -1) {
    return null;
  }

  const value = args[onlyIndex + 1];
  if (!value) {
    console.error("Error: --only requires a comma-separated list of seeders");
    process.exit(1);
  }

  const names = value.split(",").map((s) => s.trim());
  const allNames = Object.keys(seeders);

  for (const name of names) {
    if (!allNames.includes(name)) {
      console.error("Error: Unknown seeder '%s'. Use --list to see available seeders.", name);
      process.exit(1);
    }
  }

  return names as SeederName[];
}

async function main(): Promise<void> {
  const only = parseArgs();
  const entries = Object.entries(seeders).filter(
    ([name]) => only === null || only.includes(name as SeederName),
  );

  console.log("\nRunning %d seeder(s)...\n", entries.length);

  for (const [name, { fn }] of entries) {
    console.log("▶ %s", name);
    await fn();
  }

  console.log("\nSeeding complete\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
