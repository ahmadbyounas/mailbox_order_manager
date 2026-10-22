import { OrderStatus, Prisma, Order } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { InvalidStateTransitionError, TransitionOrderInput } from "./types";

/**
 * Strict Order State Machine Transitions Table
 * 
 * Rules:
 * - PENDING -> PROVISIONING
 * - PROVISIONING -> ACTIVE or FAILED
 * - FAILED -> PENDING (Admin retry only)
 * - ACTIVE -> none (Terminal state)
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PROVISIONING],
  [OrderStatus.PROVISIONING]: [OrderStatus.ACTIVE, OrderStatus.FAILED],
  [OrderStatus.ACTIVE]: [],
  [OrderStatus.FAILED]: [OrderStatus.PENDING],
};

export class OrderStateMachine {
  /**
   * Pure check to determine if a state transition is legal
   */
  public static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    const validNextStates = ALLOWED_TRANSITIONS[from];
    return validNextStates ? validNextStates.includes(to) : false;
  }

  /**
   * Retrieves all allowable next states from the given status
   */
  public static getAllowedNextStates(current: OrderStatus): readonly OrderStatus[] {
    return ALLOWED_TRANSITIONS[current] ?? [];
  }

  /**
   * Asserts whether a transition is allowed; throws InvalidStateTransitionError if illegal
   */
  public static assertValidTransition(from: OrderStatus, to: OrderStatus, orderId?: string): void {
    if (!this.canTransition(from, to)) {
      const allowed = this.getAllowedNextStates(from).join(", ") || "none (terminal state)";
      throw new InvalidStateTransitionError(
        from,
        to,
        orderId,
        `Cannot transition order status from '${from}' to '${to}'. Allowed next states from '${from}': [${allowed}].`
      );
    }
  }

  /**
   * Executes a state transition atomically inside a database transaction:
   * 1. Validates current status against expected status
   * 2. Asserts state machine transition validity
   * 3. Updates Order status
   * 4. Logs transition in AuditLog
   */
  public static async transition(
    input: TransitionOrderInput,
    txClient?: Prisma.TransactionClient
  ): Promise<Order> {
    const execute = async (tx: Prisma.TransactionClient): Promise<Order> => {
      // 1. Fetch current order state
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
      });

      if (!order) {
        throw new Error(`Order with ID '${input.orderId}' not found.`);
      }

      // 2. Concurrency / lock check if expectedCurrentStatus provided
      if (input.expectedCurrentStatus && order.status !== input.expectedCurrentStatus) {
        throw new InvalidStateTransitionError(
          order.status,
          input.targetStatus,
          order.id,
          `State conflict: expected order to be in '${input.expectedCurrentStatus}' but found '${order.status}'.`
        );
      }

      // 3. Validate transition legality
      this.assertValidTransition(order.status, input.targetStatus, order.id);

      // 4. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: input.targetStatus,
        },
      });

      // 5. Create immutable audit log entry
      await tx.auditLog.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: input.targetStatus,
          changedById: input.changedById ?? null,
          triggerSource: input.triggerSource,
          metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });

      return updatedOrder;
    };

    if (txClient) {
      return execute(txClient);
    }

    return prisma.$transaction(async (tx) => execute(tx));
  }
}
