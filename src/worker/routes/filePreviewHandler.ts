import type { Context } from "hono";
import type { AppContext } from "../context";
import { getFileContext } from "../utils/appHelpers";
import { getFileKey, normalizeRelativePath } from "../utils/fileManager";
import { handlePathValidationError, jsonError } from "../utils/response";
import { assertPathNotReserved } from "./filesShared";

const PREVIEW_SANDBOX_CSP = [
  "sandbox",
  "default-src 'none'",
  "script-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "style-src 'unsafe-inline'",
].join("; ");

export async function previewFile(c: Context<AppContext>) {
  try {
    const path = normalizeRelativePath(c.req.query("path"), { allowEmpty: false, label: "Path" });
    assertPathNotReserved(path);
    const { rootDirId } = await getFileContext(c);

    const object = await c.env.FILES_BUCKET.get(getFileKey(rootDirId, path), {
      range: c.req.raw.headers,
    });

    if (!object || !object.body) {
      return jsonError(c, "File not found", 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Disposition", "inline");
    headers.set("ETag", object.httpEtag);
    headers.set("Last-Modified", object.uploaded.toUTCString());
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Security-Policy", PREVIEW_SANDBOX_CSP);

    if (object.range) {
      const r = object.range;
      let start: number;
      let end: number;
      if ("suffix" in r) {
        start = object.size - r.suffix;
        end = object.size - 1;
      } else {
        start = r.offset ?? 0;
        end = r.length !== undefined ? start + r.length - 1 : object.size - 1;
      }
      headers.set("Content-Range", `bytes ${start}-${end}/${object.size}`);
      headers.set("Content-Length", String(end - start + 1));
      return new Response(object.body, { headers, status: 206 });
    }

    headers.set("Content-Length", String(object.size));
    return new Response(object.body, { headers, status: 200 });
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to preview file", error);
    return jsonError(c, "Failed to preview file", 500);
  }
}
