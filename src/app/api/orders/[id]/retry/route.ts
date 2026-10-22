import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { OrderService } from "@/services/order.service";
import { ApiResponse } from "@/lib/api-response";
import { Role } from "@/types/domain";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (user.role !== Role.ADMIN) {
      return ApiResponse.error(
        "Forbidden: Only an admin can retry failed orders.",
        "FORBIDDEN",
        403
      );
    }

    const retriedOrder = await OrderService.retryOrder(id, user.id);
    return ApiResponse.success(retriedOrder, "Order status transitioned to PENDING for retry.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retry order";
    return ApiResponse.error(message, "RETRY_ORDER_FAILED", 400);
  }
}
