import { prisma } from "@/lib/prisma";
import { OrderStatus, MailboxStatus, Provider, Order } from "@/types/domain";
import { OrderStateMachine } from "@/services/state-machine/order-state-machine";

export interface CreateOrderInput {
  domain: string;
  provider: Provider;
  mailboxCount: number;
  idempotencyKey?: string;
}

export interface ListOrdersFilter {
  userId?: string;
  status?: OrderStatus;
  provider?: Provider;
  page?: number;
  limit?: number;
}

export class OrderService {
  /**
   * Idempotent order creation with mailboxes and initial audit log
   */
  public static async createOrder(input: CreateOrderInput, userId: string): Promise<Order> {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existingOrder = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { mailboxes: true, auditLogs: true },
      });

      if (existingOrder) {
        console.log(`[OrderService] Idempotency hit: returning existing order ${existingOrder.id}`);
        return existingOrder as unknown as Order;
      }
    }

    // 2. Validate domain format
    const cleanDomain = input.domain.trim().toLowerCase();
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      throw new Error(`Invalid domain name format: '${input.domain}'`);
    }

    // 3. Validate mailbox count (1 to 50)
    if (input.mailboxCount < 1 || input.mailboxCount > 50) {
      throw new Error("Mailbox count must be between 1 and 50.");
    }

    // 4. Generate mailbox initial records
    const mailboxData = Array.from({ length: input.mailboxCount }, (_, i) => ({
      email: `user${i + 1}@${cleanDomain}`,
      status: MailboxStatus.PENDING,
    }));

    // 5. Atomic Transaction: Create Order + Mailboxes + Initial AuditLog
    const newOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          domain: cleanDomain,
          provider: input.provider,
          mailboxCount: input.mailboxCount,
          status: OrderStatus.PENDING,
          idempotencyKey: input.idempotencyKey ?? null,
          mailboxes: {
            create: mailboxData,
          },
          auditLogs: {
            create: {
              fromStatus: null,
              toStatus: OrderStatus.PENDING,
              changedById: userId,
              triggerSource: "CUSTOMER_ORDER_CREATED",
              metadata: {
                initialMailboxCount: input.mailboxCount,
                provider: input.provider,
              },
            },
          },
        },
        include: {
          mailboxes: true,
          auditLogs: true,
        },
      });

      return created;
    });

    return newOrder as unknown as Order;
  }

  /**
   * Retrieves an order with access control
   */
  public static async getOrderById(orderId: string, requestedByUserId: string, isAdmin: boolean) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        mailboxes: {
          orderBy: { email: "asc" },
        },
        auditLogs: {
          orderBy: { createdAt: "asc" },
          include: {
            changedBy: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!order) {
      throw new Error(`Order '${orderId}' not found.`);
    }

    // Access control: customer can only view own order
    if (!isAdmin && order.userId !== requestedByUserId) {
      throw new Error("Unauthorized: You do not have permission to access this order.");
    }

    return order;
  }

  /**
   * Lists orders with filtering and pagination
   */
  public static async listOrders(filters: ListOrdersFilter) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters.limit ?? 10));
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (filters.userId) {
      whereClause.userId = filters.userId;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }
    if (filters.provider) {
      whereClause.provider = filters.provider;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { mailboxes: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin-only retry: transitions FAILED order back to PENDING and resets mailboxes
   */
  public static async retryOrder(orderId: string, adminUserId: string): Promise<Order> {
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Enforce state machine transition FAILED -> PENDING
      const order = await OrderStateMachine.transition(
        {
          orderId,
          expectedCurrentStatus: OrderStatus.FAILED,
          targetStatus: OrderStatus.PENDING,
          changedById: adminUserId,
          triggerSource: "ADMIN_RETRY",
          metadata: { note: "Admin manually triggered retry for failed order" },
        },
        tx
      );

      // 2. Reset any failed mailboxes back to PENDING so worker can re-provision
      await tx.mailbox.updateMany({
        where: {
          orderId: order.id,
          status: MailboxStatus.FAILED,
        },
        data: {
          status: MailboxStatus.PENDING,
          errorMessage: null,
        },
      });

      return order;
    });

    return updated;
  }
}
