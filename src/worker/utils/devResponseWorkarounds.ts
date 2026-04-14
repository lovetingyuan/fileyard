import { shouldSkipContentSecurityPolicy } from "./securityHeaders";

export function normalizeDevPostUnauthorizedResponse(
  response: Response,
  requestMethod: string,
  requestUrl: string,
): Response {
  if (
    requestMethod !== "POST" ||
    response.status !== 401 ||
    !shouldSkipContentSecurityPolicy(requestUrl)
  ) {
    return response;
  }

  return new Response(response.body, {
    status: 400,
    statusText: "Bad Request",
    headers: new Headers(response.headers),
  });
}
