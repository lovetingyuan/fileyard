import type { Context } from "hono";
import type { AppContext } from "../context";
import { FilePathValidationError } from "../utils/fileManager";

export class UploadTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadTooLargeError";
  }
}

export function jsonError(
  _c: Context<AppContext>,
  message: string,
  status: number,
  headers?: HeadersInit,
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");

  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: responseHeaders,
  });
}

export function handlePathValidationError(
  c: Context<AppContext>,
  error: unknown,
): Response | undefined {
  if (error instanceof FilePathValidationError) {
    return jsonError(c, error.message, error.status);
  }
  return undefined;
}
