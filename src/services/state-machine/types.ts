import { OrderStatus } from "@prisma/client";

export type OrderStatusType = keyof typeof OrderStatus;

export class InvalidStateTransitionError extends Error {
  public readonly fromStatus: OrderStatus;
  public readonly toStatus: OrderStatus;
  public readonly orderId?: string;

  constructor(fromStatus: OrderStatus, toStatus: OrderStatus, orderId?: string, message?: string) {
    const detail = message ?? `Illegal state transition from ${fromStatus} to ${toStatus}.`;
    super(orderId ? `Order [${orderId}]: ${detail}` : detail);
    this.name = "InvalidStateTransitionError";
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    this.orderId = orderId;
  }
}

export interface TransitionOrderInput {
  orderId: string;
  targetStatus: OrderStatus;
  expectedCurrentStatus?: OrderStatus;
  changedById?: string | null;
  triggerSource: "CUSTOMER_ORDER_CREATED" | "WORKER_DISPATCH" | "WORKER_COMPLETED" | "ADMIN_RETRY" | "SYSTEM";
  metadata?: Record<string, unknown>;
}

export interface StateMachineValidationResult {
  isValid: boolean;
  allowedTransitions: readonly OrderStatus[];
  error?: string;
}
