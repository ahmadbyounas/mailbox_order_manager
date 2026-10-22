import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export class ApiResponse {
  public static success<T>(data: T, message?: string, status = 200) {
    return NextResponse.json<ApiSuccessResponse<T>>(
      {
        success: true,
        data,
        message,
      },
      { status }
    );
  }

  public static error(message: string, code = "BAD_REQUEST", status = 400, details?: unknown) {
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          message,
          code,
          details,
        },
      },
      { status }
    );
  }

  public static fromZodError(error: ZodError) {
    const formattedErrors = error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          message: "Input validation failed.",
          code: "VALIDATION_ERROR",
          details: formattedErrors,
        },
      },
      { status: 422 }
    );
  }
}
