import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getSeededUsers } from "@/lib/auth";
import { ApiResponse } from "@/lib/api-response";

export async function GET() {
  const users = await getSeededUsers();
  return ApiResponse.success(users);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { userId?: string };
    if (!body.userId) {
      return ApiResponse.error("userId is required", "BAD_REQUEST", 400);
    }

    const response = NextResponse.json({
      success: true,
      message: `Switched active user to ${body.userId}`,
    });

    response.cookies.set(AUTH_COOKIE_NAME, body.userId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch {
    return ApiResponse.error("Failed to switch user", "SWITCH_USER_FAILED", 500);
  }
}
