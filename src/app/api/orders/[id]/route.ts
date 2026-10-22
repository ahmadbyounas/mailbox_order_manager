import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { OrderService } from "@/services/order.service";
import { ApiResponse } from "@/lib/api-response";
import { Role } from "@/types/domain";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const isAdmin = user.role === Role.ADMIN;

    const order = await OrderService.getOrderById(id, user.id, isAdmin);
    return ApiResponse.success(order);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch order detail";
    const status = message.includes("Unauthorized") ? 403 : message.includes("not found") ? 404 : 400;
    return ApiResponse.error(message, "ORDER_DETAIL_ERROR", status);
  }
}
