import { PrismaClient, Role, Provider, OrderStatus, MailboxStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clean existing seed records if any
  await prisma.auditLog.deleteMany();
  await prisma.mailbox.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Admin User
  const admin = await prisma.user.create({
    data: {
      email: "admin@mailbox.test",
      name: "Admin Operator",
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Created Admin user: ${admin.email} (ID: ${admin.id})`);

  // 2. Seed Primary Customer
  const customer1 = await prisma.user.create({
    data: {
      email: "customer@mailbox.test",
      name: "Acme Corp Customer",
      role: Role.CUSTOMER,
    },
  });
  console.log(`✅ Created Customer user: ${customer1.email} (ID: ${customer1.id})`);

  // 3. Seed Secondary Customer for isolation testing
  const customer2 = await prisma.user.create({
    data: {
      email: "startup@mailbox.test",
      name: "GrowthLabs Startup",
      role: Role.CUSTOMER,
    },
  });
  console.log(`✅ Created Customer user 2: ${customer2.email} (ID: ${customer2.id})`);

  // 4. Seed an initial sample order for Customer 1 to verify views immediately
  const sampleOrder = await prisma.order.create({
    data: {
      userId: customer1.id,
      domain: "acme-outreach.com",
      provider: Provider.GOOGLE,
      mailboxCount: 3,
      status: OrderStatus.ACTIVE,
      idempotencyKey: "seed-order-acme-001",
      mailboxes: {
        create: [
          {
            email: "team1@acme-outreach.com",
            status: MailboxStatus.ACTIVE,
            externalId: "mock-goog-seed-1",
          },
          {
            email: "team2@acme-outreach.com",
            status: MailboxStatus.ACTIVE,
            externalId: "mock-goog-seed-2",
          },
          {
            email: "team3@acme-outreach.com",
            status: MailboxStatus.ACTIVE,
            externalId: "mock-goog-seed-3",
          },
        ],
      },
      auditLogs: {
        create: [
          {
            fromStatus: null,
            toStatus: OrderStatus.PENDING,
            changedById: customer1.id,
            triggerSource: "CUSTOMER_ORDER_CREATED",
            metadata: { note: "Initial seed order created" },
          },
          {
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.PROVISIONING,
            triggerSource: "WORKER_DISPATCH",
            metadata: { note: "Worker acquired lock and began provisioning" },
          },
          {
            fromStatus: OrderStatus.PROVISIONING,
            toStatus: OrderStatus.ACTIVE,
            triggerSource: "WORKER_COMPLETED",
            metadata: { note: "All 3 mailboxes provisioned successfully" },
          },
        ],
      },
    },
  });
  console.log(`✅ Created Sample Order: ${sampleOrder.id} with 3 mailboxes and audit log`);

  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
