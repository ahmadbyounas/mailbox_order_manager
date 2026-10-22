export enum Role {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN",
}

export enum Provider {
  GOOGLE = "GOOGLE",
  MICROSOFT = "MICROSOFT",
}

export enum OrderStatus {
  PENDING = "PENDING",
  PROVISIONING = "PROVISIONING",
  ACTIVE = "ACTIVE",
  FAILED = "FAILED",
}

export enum MailboxStatus {
  PENDING = "PENDING",
  PROVISIONING = "PROVISIONING",
  ACTIVE = "ACTIVE",
  FAILED = "FAILED",
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  domain: string;
  provider: Provider;
  mailboxCount: number;
  status: OrderStatus;
  idempotencyKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Mailbox {
  id: string;
  orderId: string;
  email: string;
  status: MailboxStatus;
  externalId?: string | null;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  changedById?: string | null;
  triggerSource: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}
