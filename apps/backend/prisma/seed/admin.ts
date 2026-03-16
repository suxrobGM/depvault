import { prisma } from "@/common/database";
import { hashPassword, verifyPassword } from "@/common/utils/password";
import { UserRole } from "@/generated/prisma";

export async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("  ⚠ ADMIN_EMAIL and ADMIN_PASSWORD must be set, skipping");
    return;
  }

  const existing = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN },
  });

  if (existing) {
    const updates: Record<string, unknown> = {};

    if (existing.email !== email) {
      updates.email = email;
    }

    if (existing.passwordHash) {
      const passwordMatches = await verifyPassword(password, existing.passwordHash);
      if (!passwordMatches) {
        updates.passwordHash = await hashPassword(password);
      }
    } else {
      updates.passwordHash = await hashPassword(password);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where: { id: existing.id }, data: updates });

      if (updates.email) {
        await prisma.account.updateMany({
          where: { userId: existing.id, provider: "EMAIL" },
          data: { providerAccountId: email },
        });
      }

      const changed = Object.keys(updates).join(", ");
      console.log("  ✓ Super admin updated (%s) — changed: %s", email, changed);
    } else {
      console.log("  ✓ Super admin already up to date (%s)", email);
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
