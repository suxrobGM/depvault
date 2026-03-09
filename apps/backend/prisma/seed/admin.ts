import { prisma } from "@/common/database";
import { hashPassword } from "@/common/utils/password";
import { UserRole } from "@/generated/prisma";

export async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("  ⚠ ADMIN_EMAIL and ADMIN_PASSWORD must be set, skipping");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== UserRole.SUPER_ADMIN) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: UserRole.SUPER_ADMIN },
      });
      console.log("  ✓ Existing user promoted to SUPER_ADMIN (%s)", email);
    } else {
      console.log("  ✓ Super admin already exists, skipping (%s)", email);
    }
    return;
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      firstName: "Super",
      lastName: "Admin",
      passwordHash,
      emailVerified: true,
      role: UserRole.SUPER_ADMIN,
      accounts: {
        create: {
          provider: "EMAIL",
          providerAccountId: email,
        },
      },
    },
  });

  console.log("  ✓ Super admin created (%s)", email);
}
