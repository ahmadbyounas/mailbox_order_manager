import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { OrderService } from "@/services/order.service";
import { createOrderSchema, listOrdersQuerySchema } from "@/lib/validations/order.schema";
import { ApiResponse } from "@/lib/api-response";
import { Role } from "@/types/domain";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body: unknown = await req.json();
    const validatedData = createOrderSchema.parse(body);

    const order = await OrderService.createOrder(validatedData, user.id);
    return ApiResponse.success(order, "Order created successfully", 201);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return ApiResponse.fromZodError(error);
    }
    const message = error instanceof Error ? error.message : "Failed to create order";
    return ApiResponse.error(message, "ORDER_CREATION_FAILED", 400);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const url = new URL(req.url);

    const rawParams = {
      status: url.searchParams.get("status") ?? undefined,
      provider: url.searchParams.get("provider") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const validatedQuery = listOrdersQuerySchema.parse(rawParams);

    // If customer, restrict to own orders only
    const userIdFilter = user.role === Role.ADMIN ? undefined : user.id;

    const result = await OrderService.listOrders({
      ...validatedQuery,
      userId: userIdFilter,
    });

    return ApiResponse.success(result);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return ApiResponse.fromZodError(error);
    }
    const message = error instanceof Error ? error.message : "Failed to fetch orders";
    return ApiResponse.error(message, "FETCH_ORDERS_FAILED", 400);
  }
}
