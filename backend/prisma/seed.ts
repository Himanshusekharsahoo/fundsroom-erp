import { PrismaClient, Role, CustomerStatus, CustomerType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password@123", 10);

  const users = [
    ["Admin User", "admin@fundsroom.demo", Role.ADMIN],
    ["Sales User", "sales@fundsroom.demo", Role.SALES],
    ["Warehouse User", "warehouse@fundsroom.demo", Role.WAREHOUSE],
    ["Accounts User", "accounts@fundsroom.demo", Role.ACCOUNTS],
  ] as const;

  for (const [name, email, role] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { name, role, passwordHash },
      create: { name, email, role, passwordHash },
    });
  }

  const existing = await prisma.product.count();
  if (existing === 0) {
    await prisma.product.createMany({
      data: [
        { name: "USB-C Charger", sku: "CHG-001", category: "Electronics", unitPrice: 499, currentStock: 100, minStock: 20, warehouse: "Pune-01" },
        { name: "Wireless Mouse", sku: "MOU-001", category: "Electronics", unitPrice: 799, currentStock: 60, minStock: 15, warehouse: "Pune-01" },
        { name: "Keyboard", sku: "KEY-001", category: "Electronics", unitPrice: 999, currentStock: 40, minStock: 10, warehouse: "Pune-02" }
      ]
    });
  }

  const customerCount = await prisma.customer.count();
  if (customerCount === 0) {
    await prisma.customer.create({
      data: {
        name: "Rahul Sharma",
        mobile: "9876543210",
        email: "rahul@example.com",
        businessName: "Sharma Traders",
        customerType: CustomerType.WHOLESALE,
        status: CustomerStatus.ACTIVE,
        address: "Pune, Maharashtra",
        notes: "Demo customer"
      }
    });
  }

  console.log("Seed completed.");
}

main().finally(() => prisma.$disconnect());
