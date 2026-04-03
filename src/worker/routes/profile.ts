import { Hono } from "hono";
import type { AppContext } from "../context";
import type { ProfileResponse, FileMutationResponse } from "../../types";
import { AVATAR_FILE_NAME, getAvatarPath, getFileKey } from "../utils/fileManager";
import { getFileContext } from "../utils/appHelpers";
import { jsonError } from "../utils/response";

const AVATAR_MAX_UPLOAD_BYTES = 1024 * 1024;
const AVATAR_CONTENT_TYPE = "image/png";

const profile = new Hono<AppContext>();

profile.get("/api/profile", async (c) => {
  try {
    const { rootDirId, user } = await getFileContext(c);
    const avatarKey = getFileKey(rootDirId, getAvatarPath());
    const avatar = await c.env.FILES_BUCKET.head(avatarKey);
    const avatarVersion = avatar?.uploaded.toISOString();

    const response: ProfileResponse = {
      success: true,
      profile: {
        email: user.email,
        avatarUrl: avatarVersion
          ? `/api/profile/avatar?v=${encodeURIComponent(avatarVersion)}`
          : null,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error("Failed to load profile", error);
    return jsonError(c, "Failed to load profile", 500);
  }
});

profile.get("/api/profile/avatar", async (c) => {
  try {
    const { rootDirId } = await getFileContext(c);
    const object = await c.env.FILES_BUCKET.get(getFileKey(rootDirId, getAvatarPath()));

    if (!object || !object.body) {
      return jsonError(c, "Avatar not found", 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("ETag", object.httpEtag);
    headers.set("Last-Modified", object.uploaded.toUTCString());
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(object.body, { headers, status: 200 });
  } catch (error) {
    console.error("Failed to read avatar", error);
    return jsonError(c, "Failed to read avatar", 500);
  }
});

profile.put("/api/profile/avatar", async (c) => {
  try {
    const contentLengthHeader = c.req.header("content-length");
    if (contentLengthHeader) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);
      if (!Number.isFinite(contentLength) || contentLength < 0) {
        return jsonError(c, "Invalid Content-Length header", 400);
      }
    }

    const body = await c.req.arrayBuffer();
    if (body.byteLength === 0) {
      return jsonError(c, "Avatar body is required", 400);
    }
    if (body.byteLength > AVATAR_MAX_UPLOAD_BYTES) {
      return jsonError(c, "Avatar upload exceeds the server limit", 413);
    }

    const contentType = (c.req.header("content-type") ?? "").split(";")[0]?.trim();
    if (contentType !== AVATAR_CONTENT_TYPE) {
      return jsonError(c, "Avatar must be uploaded as PNG", 400);
    }

    const { rootDirId } = await getFileContext(c);
    const avatarKey = getFileKey(rootDirId, getAvatarPath());
    await c.env.FILES_BUCKET.put(avatarKey, body, {
      customMetadata: { originalName: AVATAR_FILE_NAME, kind: "avatar" },
      httpMetadata: { contentType: AVATAR_CONTENT_TYPE },
    });

    const response: FileMutationResponse = {
      success: true,
      message: "Avatar updated successfully",
    };
    return c.json(response);
  } catch (error) {
    console.error("Failed to upload avatar", error);
    return jsonError(c, "Failed to upload avatar", 500);
  }
});

export default profile;
