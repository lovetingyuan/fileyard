import type { Context } from "hono";
import type { AppContext } from "../context";
import { getValidatedQuery, type PathQuery } from "../validation";
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

const PREVIEW_FETCH_METADATA_VARY = "Sec-Fetch-Dest, Sec-Fetch-Mode";

type PreviewByteRange =
  | {
      kind: "offset";
      length?: number;
      offset: number;
    }
  | {
      kind: "suffix";
      suffix: number;
    };

type PreviewResponseRange = {
  end: number;
  length: number;
  start: number;
};

function isDirectBrowserPreviewNavigation(c: Context<AppContext>): boolean {
  return (
    c.req.header("sec-fetch-mode")?.toLowerCase() === "navigate" &&
    c.req.header("sec-fetch-dest")?.toLowerCase() === "document"
  );
}

function parseRangeInteger(value: string): number | null {
  if (!/^\d+$/u.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parsePreviewByteRange(value: string | undefined): PreviewByteRange | null {
  if (!value) {
    return null;
  }

  const match = /^\s*bytes=(\d*)-(\d*)\s*$/u.exec(value);
  if (!match) {
    return null;
  }

  const [, startValue, endValue] = match;
  if (!startValue && !endValue) {
    return null;
  }

  if (!startValue) {
    const suffix = parseRangeInteger(endValue);
    return suffix && suffix > 0 ? { kind: "suffix", suffix } : null;
  }

  const offset = parseRangeInteger(startValue);
  if (offset === null) {
    return null;
  }

  if (!endValue) {
    return { kind: "offset", offset };
  }

  const end = parseRangeInteger(endValue);
  if (end === null || end < offset) {
    return null;
  }

  return { kind: "offset", offset, length: end - offset + 1 };
}

function toR2Range(range: PreviewByteRange): R2Range {
  return range.kind === "suffix"
    ? { suffix: range.suffix }
    : {
        offset: range.offset,
        ...(range.length === undefined ? {} : { length: range.length }),
      };
}

function getPreviewResponseRange(
  range: PreviewByteRange,
  objectSize: number,
): PreviewResponseRange | null {
  if (objectSize <= 0) {
    return null;
  }

  if (range.kind === "suffix") {
    const length = Math.min(range.suffix, objectSize);
    const start = objectSize - length;
    return {
      start,
      end: objectSize - 1,
      length,
    };
  }

  if (range.offset >= objectSize) {
    return null;
  }

  const end =
    range.length === undefined
      ? objectSize - 1
      : Math.min(range.offset + range.length - 1, objectSize - 1);

  return {
    start: range.offset,
    end,
    length: end - range.offset + 1,
  };
}

export async function previewFile(c: Context<AppContext>) {
  try {
    if (isDirectBrowserPreviewNavigation(c)) {
      return jsonError(c, "Preview cannot be opened directly", 403, {
        "Cache-Control": "private, no-store",
        Vary: PREVIEW_FETCH_METADATA_VARY,
      });
    }

    const query = getValidatedQuery<PathQuery>(c);
    const path = normalizeRelativePath(query.path, { allowEmpty: false, label: "Path" });
    assertPathNotReserved(path);
    const { rootDirId } = await getFileContext(c);
    const previewRange = parsePreviewByteRange(c.req.header("range"));

    const object = await c.env.FILES_BUCKET.get(getFileKey(rootDirId, path), {
      ...(previewRange ? { range: toR2Range(previewRange) } : {}),
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
    headers.set("Vary", PREVIEW_FETCH_METADATA_VARY);

    if (previewRange) {
      const responseRange = getPreviewResponseRange(previewRange, object.size);
      if (!responseRange) {
        headers.set("Content-Range", `bytes */${object.size}`);
        headers.set("Content-Length", "0");
        return new Response(null, { headers, status: 416 });
      }

      headers.set(
        "Content-Range",
        `bytes ${responseRange.start}-${responseRange.end}/${object.size}`,
      );
      headers.set("Content-Length", String(responseRange.length));
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
