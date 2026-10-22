import { z } from "zod";
import { Provider, OrderStatus } from "@/types/domain";

export const createOrderSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain is required")
    .max(253, "Domain name too long")
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*\.[a-zA-Z]{2,}$/,
      "Please provide a valid domain name (e.g. company.com or outreach.io)"
    ),
  provider: z.nativeEnum(Provider),
  mailboxCount: z
    .number()
    .int("Mailbox count must be an integer")
    .min(1, "Mailbox count must be at least 1")
    .max(50, "Mailbox count cannot exceed 50"),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export type CreateOrderSchemaInput = z.infer<typeof createOrderSchema>;

export const listOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  provider: z.nativeEnum(Provider).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>;
