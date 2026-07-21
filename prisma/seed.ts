import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: {
      name: "Admin",
      description: "Full system access",
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: "Manager" },
    update: {},
    create: {
      name: "Manager",
      description: "Branch and operations management",
    },
  });

  const mainBranch = await prisma.branch.upsert({
    where: { code: "HQ" },
    update: {},
    create: {
      name: "Head Office",
      code: "HQ",
      address: "Addis Ababa, Ethiopia",
    },
  });

  const passwordHash = await hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      passwordHash,
      roleId: adminRole.id,
      branchId: mainBranch.id,
      isActive: true,
    },
    create: {
      email: "admin@example.com",
      name: "System Admin",
      passwordHash,
      roleId: adminRole.id,
      branchId: mainBranch.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {
      passwordHash,
      roleId: managerRole.id,
      branchId: mainBranch.id,
      isActive: true,
    },
    create: {
      email: "manager@example.com",
      name: "Branch Manager",
      passwordHash,
      roleId: managerRole.id,
      branchId: mainBranch.id,
    },
  });

  console.log("Seed complete.");
  console.log("Admin login: admin@example.com / admin123");
  console.log("Manager login: manager@example.com / admin123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
