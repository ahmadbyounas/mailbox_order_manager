import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { User, Role } from "@/types/domain";

export const AUTH_COOKIE_NAME = "mailbox_active_user_id";

export async function getCurrentUser(): Promise<User> {
  const cookieStore = await cookies();
  const userIdFromCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (userIdFromCookie) {
    const user = await prisma.user.findUnique({
      where: { id: userIdFromCookie },
    });
    if (user) {
      return user as unknown as User;
    }
  }

  // Fallback to seeded customer
  const defaultCustomer = await prisma.user.findFirst({
    where: { role: Role.CUSTOMER },
    orderBy: { createdAt: "asc" },
  });

  if (defaultCustomer) {
    return defaultCustomer as unknown as User;
  }

  // Fallback mock if database not yet migrated
  return {
    id: "mock-customer-id",
    name: "Customer User (Default)",
    email: "customer@mailbox.test",
    role: Role.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getSeededUsers(): Promise<User[]> {
  try {
    const users = await prisma.user.findMany({
      orderBy: { role: "asc" },
    });
    return users as unknown as User[];
  } catch {
    return [
      {
        id: "mock-customer-id",
        name: "Acme Corp Customer",
        email: "customer@mailbox.test",
        role: Role.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "mock-admin-id",
        name: "Admin Operator",
        email: "admin@mailbox.test",
        role: Role.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
}
