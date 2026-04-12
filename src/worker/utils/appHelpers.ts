import type { Context } from "hono";
import type { AppContext, AppBindings } from "../context";
import { createDb } from "../db/client";
import { getOrCreateAppProfileByDb } from "../auth/profile";
import type { AuthUser } from "../auth";
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  getFolderMarkerKeys,
  getFolderPrefix,
  parseMaxUploadBytes,
} from "./fileManager";
import { UploadTooLargeError } from "./response";

function appendVary(currentValue: string | null, nextValue: string): string {
  const existingValues = (currentValue ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!existingValues.includes(nextValue)) {
    existingValues.push(nextValue);
  }

  return existingValues.join(", ");
}

function getAllowedOrigins(c: Context<AppContext>): Set<string> {
  const allowedOrigins = new Set<string>([new URL(c.req.url).origin]);
  if (c.env.APP_URL) {
    try {
      allowedOrigins.add(new URL(c.env.APP_URL).origin);
    } catch (error) {
      console.warn("APP_URL is not a valid URL:", error);
    }
  }
  return allowedOrigins;
}

export function isAllowedOrigin(c: Context<AppContext>, origin: string): boolean {
  return getAllowedOrigins(c).has(origin);
}

export function applyCorsHeaders(headers: Headers, origin: string): void {
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set("Vary", appendVary(headers.get("Vary"), "Origin"));
}

export function getUploadLimitBytes(env: AppBindings): number {
  return parseMaxUploadBytes(env.MAX_UPLOAD_BYTES) || DEFAULT_MAX_UPLOAD_BYTES;
}

export function createUploadStream(
  body: ReadableStream<Uint8Array>,
  maxUploadBytes: number,
): ReadableStream<Uint8Array> {
  let totalBytes = 0;

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        totalBytes += chunk.byteLength;
        if (totalBytes > maxUploadBytes) {
          throw new UploadTooLargeError("File exceeds the upload size limit");
        }
        controller.enqueue(chunk);
      },
    }),
  );
}

export async function folderExists(
  env: AppBindings,
  rootDirId: string,
  folderPath: string,
): Promise<boolean> {
  if (!folderPath) {
    return true;
  }

  for (const markerKey of getFolderMarkerKeys(rootDirId, folderPath)) {
    const marker = await env.FILES_BUCKET.head(markerKey);
    if (marker) {
      return true;
    }
  }

  const listing = await env.FILES_BUCKET.list({
    prefix: getFolderPrefix(rootDirId, folderPath),
    limit: 1,
  });

  return listing.objects.length > 0 || listing.delimitedPrefixes.length > 0;
}

export async function getFileContext(
  c: Context<AppContext>,
): Promise<{ rootDirId: string; user: AuthUser }> {
  const user = c.get("user");
  if (!user) {
    throw new Error("Authenticated user missing from context");
  }

  const cachedProfile = c.get("appProfile");
  if (cachedProfile) {
    return {
      rootDirId: cachedProfile.rootDirId,
      user,
    };
  }

  const profile = await getOrCreateAppProfileByDb(createDb(c.env), user.id, user.email);
  c.set("appProfile", profile);

  return {
    rootDirId: profile.rootDirId,
    user,
  };
}
