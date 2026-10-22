import { prisma } from "@/lib/prisma";
import { OrderStatus, MailboxStatus, Order, Provider } from "@/types/domain";
import { OrderStateMachine } from "@/services/state-machine/order-state-machine";
import { MailboxProviderFactory } from "@/providers/provider-factory";

export interface WorkerProcessResult {
  processedOrderCount: number;
  orders: {
    orderId: string;
    finalStatus: OrderStatus;
    successMailboxCount: number;
    failedMailboxCount: number;
  }[];
}

export class ProvisioningWorker {
  private isRunning = false;

  /**
   * Processes all pending orders safely and idempotently.
   * Concurrency Safe: Uses atomic state transition (PENDING -> PROVISIONING)
   * so running multiple worker instances in parallel will never double-process an order.
   */
  public async processPendingOrders(batchSize = 10): Promise<WorkerProcessResult> {
    const result: WorkerProcessResult = {
      processedOrderCount: 0,
      orders: [],
    };

    // 1. Find candidates in PENDING state
    // We only fetch IDs to avoid stale object state
    const pendingOrderCandidates = await prisma.order.findMany({
      where: { status: OrderStatus.PENDING },
      select: { id: true },
      take: batchSize,
      orderBy: { createdAt: "asc" },
    });

    if (pendingOrderCandidates.length === 0) {
      return result;
    }

    console.log(`[Worker] Found ${pendingOrderCandidates.length} candidate pending order(s).`);

    for (const candidate of pendingOrderCandidates) {
      const orderSummary = await this.processSingleOrder(candidate.id);
      if (orderSummary) {
        result.processedOrderCount++;
        result.orders.push(orderSummary);
      }
    }

    return result;
  }

  /**
   * Processes a single order atomically
   */
  public async processSingleOrder(orderId: string) {
    // 1. Atomic Lock: Attempt state transition from PENDING -> PROVISIONING
    let lockedOrder: Order;
    try {
      lockedOrder = await OrderStateMachine.transition({
        orderId,
        expectedCurrentStatus: OrderStatus.PENDING,
        targetStatus: OrderStatus.PROVISIONING,
        triggerSource: "WORKER_DISPATCH",
        metadata: { workerId: `worker-${process.pid}`, timestamp: new Date().toISOString() },
      });
      console.log(`[Worker] Successfully acquired lock for Order ${orderId}. Status: PROVISIONING`);
    } catch {
      // Another worker or process already acquired or changed this order
      console.log(`[Worker] Order ${orderId} skipped: already acquired or no longer PENDING.`);
      return null;
    }

    // 2. Fetch order details with mailboxes
    const order = await prisma.order.findUnique({
      where: { id: lockedOrder.id },
      include: { mailboxes: true },
    });

    if (!order) {
      console.error(`[Worker] Unexpected: Order ${orderId} not found after acquiring lock.`);
      return null;
    }

    const providerStrategy = MailboxProviderFactory.getProvider(order.provider as Provider);
    let successCount = 0;
    let failureCount = 0;

    console.log(
      `[Worker] Provisioning ${order.mailboxes.length} mailbox(es) for ${order.domain} via ${order.provider}...`
    );

    // 3. Process each mailbox sequentially
    for (let i = 0; i < order.mailboxes.length; i++) {
      const mailbox = order.mailboxes[i];

      // Mark individual mailbox as PROVISIONING
      await prisma.mailbox.update({
        where: { id: mailbox.id },
        data: { status: MailboxStatus.PROVISIONING },
      });

      console.log(`[Worker] Calling provider for [${i + 1}/${order.mailboxes.length}]: ${mailbox.email}`);

      const provisionResult = await providerStrategy.provisionMailbox({
        orderId: order.id,
        domain: order.domain,
        index: i + 1,
        email: mailbox.email,
      });

      if (provisionResult.success) {
        successCount++;
        await prisma.mailbox.update({
          where: { id: mailbox.id },
          data: {
            status: MailboxStatus.ACTIVE,
            externalId: provisionResult.externalId,
            errorMessage: null,
          },
        });
        console.log(`[Worker] Mailbox ${mailbox.email} ACTIVE (externalId: ${provisionResult.externalId})`);
      } else {
        failureCount++;
        await prisma.mailbox.update({
          where: { id: mailbox.id },
          data: {
            status: MailboxStatus.FAILED,
            errorMessage: provisionResult.errorMessage,
          },
        });
        console.warn(`[Worker] Mailbox ${mailbox.email} FAILED: ${provisionResult.errorMessage}`);
      }
    }

    // 4. Finalize order status based on mailbox outcomes
    const finalStatus = failureCount === 0 ? OrderStatus.ACTIVE : OrderStatus.FAILED;

    await OrderStateMachine.transition({
      orderId: order.id,
      expectedCurrentStatus: OrderStatus.PROVISIONING,
      targetStatus: finalStatus,
      triggerSource: "WORKER_COMPLETED",
      metadata: {
        totalMailboxes: order.mailboxes.length,
        successCount,
        failureCount,
        summary:
          finalStatus === OrderStatus.ACTIVE
            ? `Successfully provisioned all ${successCount} mailboxes.`
            : `Provisioning failed with ${failureCount} error(s) out of ${order.mailboxes.length} mailboxes.`,
      },
    });

    console.log(`[Worker] Order ${order.id} finished with status: ${finalStatus}`);

    return {
      orderId: order.id,
      finalStatus,
      successMailboxCount: successCount,
      failedMailboxCount: failureCount,
    };
  }

  /**
   * Continuous polling loop
   */
  public async startContinuousLoop(intervalMs = 4000): Promise<void> {
    this.isRunning = true;
    console.log(`[Worker] Provisioning Worker daemon started. Polling every ${intervalMs}ms...`);

    while (this.isRunning) {
      try {
        await this.processPendingOrders();
      } catch (err) {
        console.error("[Worker] Unhandled error during poll cycle:", err);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  public stop(): void {
    console.log("[Worker] Stopping worker daemon...");
    this.isRunning = false;
  }
}
