import { NextResponse } from "next/server";

type ApiErrorOptions = {
  status?: number;
  details?: unknown;
};

/**
 * Uniform API error response shape:
 * { success: false, error: string, details?: unknown }
 */
export function apiError(message: string, options: ApiErrorOptions = {}) {
  const { status = 500, details } = options;
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status }
  );
}

/**
 * Uniform API success response shape:
 * { success: true, data: T }
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
