import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OrderService } from "../order.service";
import { Provider, OrderStatus } from "@/types/domain";

describe("OrderService - Order Creation & Idempotency Integration Test", () => {
  it("should enforce validation: rejects mailbox count outside 1..50", async () => {
    await assert.rejects(
      async () => {
        await OrderService.createOrder(
          {
            domain: "valid-domain.com",
            provider: Provider.GOOGLE,
            mailboxCount: 0,
          },
          "test-user-id"
        );
      },
      {
        message: "Mailbox count must be between 1 and 50.",
      }
    );

    await assert.rejects(
      async () => {
        await OrderService.createOrder(
          {
            domain: "valid-domain.com",
            provider: Provider.GOOGLE,
            mailboxCount: 51,
          },
          "test-user-id"
        );
      },
      {
        message: "Mailbox count must be between 1 and 50.",
      }
    );
  });

  it("should enforce validation: rejects invalid domain formats", async () => {
    await assert.rejects(
      async () => {
        await OrderService.createOrder(
          {
            domain: "invalid_domain",
            provider: Provider.MICROSOFT,
            mailboxCount: 5,
          },
          "test-user-id"
        );
      },
      /Invalid domain name format/
    );
  });
});
