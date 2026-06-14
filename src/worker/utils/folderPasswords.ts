import type { Context } from "hono";
import {
  SHARE_PASSWORD_MAX_LENGTH,
  SHARE_PASSWORD_MIN_LENGTH,
  type FolderProtectionState,
  type VerifyFolderPasswordResponse,
} from "../../types";
import type { AppBindings, AppContext } from "../context";
import { folderExists } from "./appHelpers";
import {
  FOLDER_MARKER_NAME,
  FilePathValidationError,
  getFolderMarkerKey,
  getFolderMarkerKeys,
  getFolderPrefix,
} from "./fileManager";

export const FOLDER_UNLOCK_HEADER = "X-Fileyard-Folder-Unlock";
export const FOLDER_UNLOCK_QUERY_PARAM = "folderUnlockToken";
export const ENCRYPTED_FOLDER_BATCH_DELETE_MESSAGE = "暂不支持批量删除操作包含加密目录";

const LEGACY_FOLDER_MARKER_NAME = ".fileshare-folder";
const FOLDER_PASSWORD_PURPOSE = "fileyard:folder-password:v1";
const FOLDER_UNLOCK_PURPOSE = "fileyard:folder-unlock:v1";
const FOLDER_UNLOCK_VERSION = 1;
const FOLDER_PASSWORD_SALT_KEY = "folderPasswordSalt";
const FOLDER_PASSWORD_VERIFIER_KEY = "folderPasswordVerifier";
const FOLDER_PASSWORD_VERSION_KEY = "folderPasswordVersion";
const FOLDER_UNLOCK_TTL_MS = 30 * 60 * 1000;
const FOLDER_UNLOCK_FAILURE_TTL_SECONDS = 10 * 60;
const FOLDER_UNLOCK_MAX_FAILURES = 10;
const RANDOM_BYTES = 16;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type FolderPasswordRecord = {
  key: string;
  object: R2Object;
  passwordSalt: string;
  passwordVerifier: string;
};

type FolderMarkerRecord = {
  key: string;
  object: R2Object;
};

type FolderUnlockPayload = {
  v: typeof FOLDER_UNLOCK_VERSION;
  type: "folder-unlock";
  rootDirId: string;
  protectedPath: string;
  exp: number;
};

export class FolderLockedError extends Error {
  readonly protectedPath: string;

  constructor(protectedPath: string) {
    super("Folder password required");
    this.name = "FolderLockedError";
    this.protectedPath = protectedPath;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const padding = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  return base64ToBytes(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
}

function createRandomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

function getFolderPasswordSecret(env: AppBindings): string {
  const secret = env.SHARE_LINK_SECRET;
  if (!secret) {
    throw new Error("SHARE_LINK_SECRET is not configured");
  }
  return secret;
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
}

async function signPurposePayload(
  env: AppBindings,
  purpose: string,
  payload: string,
): Promise<Uint8Array> {
  const key = await importSigningKey(getFolderPasswordSecret(env));
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(`${purpose}\n${payload}`),
  );
  return new Uint8Array(signature);
}

function timingSafeEqualBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return !crypto.subtle.timingSafeEqual(left, left);
  }
  return crypto.subtle.timingSafeEqual(left, right);
}

async function digestBase64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return encodeBase64Url(new Uint8Array(digest));
}

async function createPasswordVerifier(
  env: AppBindings,
  salt: string,
  password: string,
): Promise<string> {
  const signature = await signPurposePayload(
    env,
    FOLDER_PASSWORD_PURPOSE,
    `${salt}\n${password.trim()}`,
  );
  return encodeBase64Url(signature);
}

function parseFolderUnlockPayload(value: unknown): FolderUnlockPayload | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("v" in value) ||
    !("type" in value) ||
    !("rootDirId" in value) ||
    !("protectedPath" in value) ||
    !("exp" in value)
  ) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    record.v !== FOLDER_UNLOCK_VERSION ||
    record.type !== "folder-unlock" ||
    typeof record.rootDirId !== "string" ||
    typeof record.protectedPath !== "string" ||
    typeof record.exp !== "number" ||
    !Number.isInteger(record.exp)
  ) {
    return null;
  }

  return {
    v: FOLDER_UNLOCK_VERSION,
    type: "folder-unlock",
    rootDirId: record.rootDirId,
    protectedPath: record.protectedPath,
    exp: record.exp,
  };
}

async function createSignedUnlockToken(
  env: AppBindings,
  payload: FolderUnlockPayload,
): Promise<string> {
  const payloadJson = JSON.stringify(payload);
  const payloadBytes = textEncoder.encode(payloadJson);
  const signature = await signPurposePayload(env, FOLDER_UNLOCK_PURPOSE, payloadJson);
  return `${encodeBase64Url(payloadBytes)}.${encodeBase64Url(signature)}`;
}

async function verifySignedUnlockToken(
  env: AppBindings,
  token: string,
): Promise<FolderUnlockPayload | null> {
  const parts = token.split(".");
  const [encodedPayload, encodedSignature] = parts;
  if (!encodedPayload || !encodedSignature || parts.length !== 2) {
    return null;
  }

  try {
    const payloadBytes = decodeBase64Url(encodedPayload);
    const payloadJson = textDecoder.decode(payloadBytes);
    const signature = decodeBase64Url(encodedSignature);
    const expectedSignature = await signPurposePayload(env, FOLDER_UNLOCK_PURPOSE, payloadJson);
    if (!timingSafeEqualBytes(signature, expectedSignature)) {
      return null;
    }

    return parseFolderUnlockPayload(JSON.parse(payloadJson));
  } catch {
    return null;
  }
}

function isFolderPasswordMetadata(
  metadata: R2Object["customMetadata"] | undefined,
): metadata is Record<string, string> {
  return Boolean(metadata?.[FOLDER_PASSWORD_SALT_KEY] && metadata?.[FOLDER_PASSWORD_VERIFIER_KEY]);
}

function getPathSegments(path: string): string[] {
  return path ? path.split("/") : [];
}

function getParentPath(path: string): string {
  const separatorIndex = path.lastIndexOf("/");
  return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
}

function toMarkerFolderPath(rootDirId: string, key: string): string | null {
  const rootPrefix = `${rootDirId}/`;
  if (!key.startsWith(rootPrefix)) {
    return null;
  }

  const relativeKey = key.slice(rootPrefix.length);
  for (const markerName of [FOLDER_MARKER_NAME, LEGACY_FOLDER_MARKER_NAME]) {
    if (relativeKey === markerName) {
      return "";
    }

    const suffix = `/${markerName}`;
    if (relativeKey.endsWith(suffix)) {
      return relativeKey.slice(0, -suffix.length);
    }
  }

  return null;
}

async function getFolderMarker(
  env: AppBindings,
  rootDirId: string,
  folderPath: string,
): Promise<FolderMarkerRecord | null> {
  for (const markerKey of getFolderMarkerKeys(rootDirId, folderPath)) {
    const object = await env.FILES_BUCKET.head(markerKey);
    if (object) {
      return { key: markerKey, object };
    }
  }

  return null;
}

async function ensureFolderMarker(
  env: AppBindings,
  rootDirId: string,
  folderPath: string,
): Promise<FolderMarkerRecord> {
  const marker = await getFolderMarker(env, rootDirId, folderPath);
  if (marker) {
    return marker;
  }

  if (!(await folderExists(env, rootDirId, folderPath))) {
    throw new FilePathValidationError("Folder not found", 404);
  }

  const key = getFolderMarkerKey(rootDirId, folderPath);
  const putResult = await env.FILES_BUCKET.put(key, new Uint8Array(), {
    customMetadata: {
      kind: "folder-marker",
      createdAt: new Date().toISOString(),
    },
    onlyIf: new Headers({ "If-None-Match": "*" }),
  });
  if (!putResult) {
    const latestMarker = await getFolderMarker(env, rootDirId, folderPath);
    if (latestMarker) {
      return latestMarker;
    }
    throw new FilePathValidationError("Folder changed", 409);
  }

  return { key, object: putResult };
}

async function getFolderPasswordRecord(
  env: AppBindings,
  rootDirId: string,
  folderPath: string,
): Promise<FolderPasswordRecord | null> {
  if (!folderPath) {
    return null;
  }

  const marker = await getFolderMarker(env, rootDirId, folderPath);
  if (!marker || !isFolderPasswordMetadata(marker.object.customMetadata)) {
    return null;
  }

  return {
    ...marker,
    passwordSalt: marker.object.customMetadata[FOLDER_PASSWORD_SALT_KEY],
    passwordVerifier: marker.object.customMetadata[FOLDER_PASSWORD_VERIFIER_KEY],
  };
}

export async function findProtectedPath(
  env: AppBindings,
  rootDirId: string,
  path: string,
): Promise<string | null> {
  let currentPath = "";
  for (const segment of getPathSegments(path)) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    if (await getFolderPasswordRecord(env, rootDirId, currentPath)) {
      return currentPath;
    }
  }

  return null;
}

async function hasProtectedDescendant(
  env: AppBindings,
  rootDirId: string,
  folderPath: string,
): Promise<boolean> {
  const currentMarkerKeys = new Set(getFolderMarkerKeys(rootDirId, folderPath));
  const prefix = getFolderPrefix(rootDirId, folderPath);
  let cursor: string | undefined;

  do {
    const listing = await env.FILES_BUCKET.list({
      cursor,
      include: ["customMetadata"],
      prefix,
    });
    for (const object of listing.objects) {
      if (currentMarkerKeys.has(object.key)) {
        continue;
      }
      if (
        toMarkerFolderPath(rootDirId, object.key) &&
        isFolderPasswordMetadata(object.customMetadata)
      ) {
        return true;
      }
    }
    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);

  return false;
}

export async function getFolderProtectionState(
  env: AppBindings,
  rootDirId: string,
  folderPath: string,
): Promise<FolderProtectionState> {
  const selfProtected = Boolean(await getFolderPasswordRecord(env, rootDirId, folderPath));
  if (selfProtected) {
    return {
      passwordProtected: true,
      protectedBy: null,
    };
  }

  return {
    passwordProtected: false,
    protectedBy: await findProtectedPath(env, rootDirId, getParentPath(folderPath)),
  };
}

export async function getFolderProtectionStates(
  env: AppBindings,
  rootDirId: string,
  folderPaths: string[],
): Promise<Map<string, FolderProtectionState>> {
  const entries = await Promise.all(
    folderPaths.map(
      async (folderPath) =>
        [folderPath, await getFolderProtectionState(env, rootDirId, folderPath)] as const,
    ),
  );

  return new Map(entries);
}

export async function getFileProtectedBy(
  env: AppBindings,
  rootDirId: string,
  filePath: string,
): Promise<string | null> {
  return findProtectedPath(env, rootDirId, getParentPath(filePath));
}

export function getProtectedPathsFromObjects(
  rootDirId: string,
  objects: Array<Pick<R2Object, "key" | "customMetadata">>,
): Set<string> {
  const protectedPaths = new Set<string>();
  for (const object of objects) {
    const folderPath = toMarkerFolderPath(rootDirId, object.key);
    if (folderPath && isFolderPasswordMetadata(object.customMetadata)) {
      protectedPaths.add(folderPath);
    }
  }
  return protectedPaths;
}

function getNearestProtectedPath(path: string, protectedPaths: Set<string>): string | null {
  let currentPath = "";
  for (const segment of getPathSegments(path)) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    if (protectedPaths.has(currentPath)) {
      return currentPath;
    }
  }

  return null;
}

export function getProtectionStateFromSet(
  folderPath: string,
  protectedPaths: Set<string>,
): FolderProtectionState {
  if (protectedPaths.has(folderPath)) {
    return {
      passwordProtected: true,
      protectedBy: null,
    };
  }

  return {
    passwordProtected: false,
    protectedBy: getNearestProtectedPath(getParentPath(folderPath), protectedPaths),
  };
}

export function getFolderPasswordValidationError(password: string): string | null {
  const normalizedPassword = password.trim();
  if (normalizedPassword.length < SHARE_PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${SHARE_PASSWORD_MIN_LENGTH} characters long`;
  }

  if (normalizedPassword.length > SHARE_PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${SHARE_PASSWORD_MAX_LENGTH} characters long`;
  }

  return null;
}

export async function setFolderPassword(
  env: AppBindings,
  rootDirId: string,
  folderPath: string,
  password: string,
): Promise<void> {
  if (!folderPath) {
    throw new FilePathValidationError("Home folder does not support passwords");
  }

  const passwordError = getFolderPasswordValidationError(password);
  if (passwordError) {
    throw new FilePathValidationError(passwordError);
  }

  if (await findProtectedPath(env, rootDirId, getParentPath(folderPath))) {
    throw new FilePathValidationError("A parent folder already has a password", 409);
  }

  if (await getFolderPasswordRecord(env, rootDirId, folderPath)) {
    throw new FilePathValidationError("Folder already has a password", 409);
  }

  if (await hasProtectedDescendant(env, rootDirId, folderPath)) {
    throw new FilePathValidationError("A child folder already has a password", 409);
  }

  const marker = await ensureFolderMarker(env, rootDirId, folderPath);
  const passwordSalt = createRandomBase64Url(RANDOM_BYTES);
  const passwordVerifier = await createPasswordVerifier(env, passwordSalt, password);
  const putResult = await env.FILES_BUCKET.put(marker.key, new Uint8Array(), {
    customMetadata: {
      ...(marker.object.customMetadata ?? {}),
      [FOLDER_PASSWORD_VERSION_KEY]: String(FOLDER_UNLOCK_VERSION),
      [FOLDER_PASSWORD_SALT_KEY]: passwordSalt,
      [FOLDER_PASSWORD_VERIFIER_KEY]: passwordVerifier,
    },
    onlyIf: { etagMatches: marker.object.etag },
  });

  if (!putResult) {
    throw new FilePathValidationError("Folder changed", 409);
  }
}

async function verifyPasswordRecord(
  env: AppBindings,
  record: FolderPasswordRecord,
  password: string,
): Promise<boolean> {
  const expectedVerifier = await createPasswordVerifier(env, record.passwordSalt, password);
  return timingSafeEqualBytes(
    textEncoder.encode(expectedVerifier),
    textEncoder.encode(record.passwordVerifier),
  );
}

function getUnlockClientId(c: Context<AppContext>): string {
  const forwardedFor = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return c.req.header("cf-connecting-ip") ?? forwardedFor ?? "unknown";
}

async function getUnlockAttemptKey(
  c: Context<AppContext>,
  rootDirId: string,
  protectedPath: string,
): Promise<string> {
  return `folder-unlock:${await digestBase64Url(
    `${rootDirId}:${protectedPath}:${getUnlockClientId(c)}`,
  )}`;
}

async function getFailedUnlockCount(
  c: Context<AppContext>,
  rootDirId: string,
  protectedPath: string,
): Promise<number> {
  const raw = await c.env.FILE_YARD_KV.get(await getUnlockAttemptKey(c, rootDirId, protectedPath));
  const count = raw ? Number(raw) : 0;
  return Number.isInteger(count) && count > 0 ? count : 0;
}

async function recordFailedUnlock(
  c: Context<AppContext>,
  rootDirId: string,
  protectedPath: string,
): Promise<void> {
  const key = await getUnlockAttemptKey(c, rootDirId, protectedPath);
  const currentCount = await getFailedUnlockCount(c, rootDirId, protectedPath);
  await c.env.FILE_YARD_KV.put(key, String(currentCount + 1), {
    expirationTtl: FOLDER_UNLOCK_FAILURE_TTL_SECONDS,
  });
}

async function clearFailedUnlocks(
  c: Context<AppContext>,
  rootDirId: string,
  protectedPath: string,
): Promise<void> {
  await c.env.FILE_YARD_KV.delete(await getUnlockAttemptKey(c, rootDirId, protectedPath));
}

export async function verifyFolderPasswordForPath(
  c: Context<AppContext>,
  rootDirId: string,
  path: string,
  password: string,
): Promise<VerifyFolderPasswordResponse> {
  const passwordError = getFolderPasswordValidationError(password);
  if (passwordError) {
    throw new FilePathValidationError(passwordError);
  }

  const protectedPath = await findProtectedPath(c.env, rootDirId, path);
  if (!protectedPath) {
    throw new FilePathValidationError("Folder does not require a password");
  }

  if ((await getFailedUnlockCount(c, rootDirId, protectedPath)) >= FOLDER_UNLOCK_MAX_FAILURES) {
    throw new FilePathValidationError("Too many password attempts", 429);
  }

  const record = await getFolderPasswordRecord(c.env, rootDirId, protectedPath);
  if (!record || !(await verifyPasswordRecord(c.env, record, password))) {
    await recordFailedUnlock(c, rootDirId, protectedPath);
    throw new FilePathValidationError("Invalid password", 403);
  }

  await clearFailedUnlocks(c, rootDirId, protectedPath);
  const unlockToken = await createSignedUnlockToken(c.env, {
    v: FOLDER_UNLOCK_VERSION,
    type: "folder-unlock",
    rootDirId,
    protectedPath,
    exp: Date.now() + FOLDER_UNLOCK_TTL_MS,
  });

  return {
    success: true,
    protectedPath,
    unlockToken,
  };
}

export function getFolderUnlockTokenFromRequest(c: Context<AppContext>): string | undefined {
  return c.req.header(FOLDER_UNLOCK_HEADER) ?? c.req.query(FOLDER_UNLOCK_QUERY_PARAM);
}

export async function isFolderUnlockTokenValid(
  env: AppBindings,
  rootDirId: string,
  protectedPath: string,
  token: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!token) {
    return false;
  }

  const payload = await verifySignedUnlockToken(env, token);
  return Boolean(
    payload &&
    payload.rootDirId === rootDirId &&
    payload.protectedPath === protectedPath &&
    now < payload.exp,
  );
}

export async function assertPathAccess(
  c: Context<AppContext>,
  rootDirId: string,
  path: string,
): Promise<string | null> {
  const protectedPath = await findProtectedPath(c.env, rootDirId, path);
  if (!protectedPath) {
    return null;
  }

  if (
    await isFolderUnlockTokenValid(
      c.env,
      rootDirId,
      protectedPath,
      getFolderUnlockTokenFromRequest(c),
    )
  ) {
    return protectedPath;
  }

  throw new FolderLockedError(protectedPath);
}

export async function assertPathNotPasswordProtected(
  env: AppBindings,
  rootDirId: string,
  path: string,
  message = "Path is password protected",
): Promise<void> {
  if (await findProtectedPath(env, rootDirId, path)) {
    throw new FilePathValidationError(message, 403);
  }
}

export async function removeFolderPassword(
  c: Context<AppContext>,
  rootDirId: string,
  folderPath: string,
): Promise<void> {
  const marker = await getFolderMarker(c.env, rootDirId, folderPath);
  if (!marker || !isFolderPasswordMetadata(marker.object.customMetadata)) {
    throw new FilePathValidationError("Folder does not have a password", 404);
  }

  await assertPathAccess(c, rootDirId, folderPath);
  const nextMetadata = { ...(marker.object.customMetadata ?? {}) };
  delete nextMetadata[FOLDER_PASSWORD_VERSION_KEY];
  delete nextMetadata[FOLDER_PASSWORD_SALT_KEY];
  delete nextMetadata[FOLDER_PASSWORD_VERIFIER_KEY];

  const putResult = await c.env.FILES_BUCKET.put(marker.key, new Uint8Array(), {
    customMetadata: nextMetadata,
    onlyIf: { etagMatches: marker.object.etag },
  });
  if (!putResult) {
    throw new FilePathValidationError("Folder changed", 409);
  }
}

export function folderLockedResponse(protectedPath: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Folder password required",
      code: "folder_locked",
      protectedPath,
    }),
    {
      status: 423,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export function handleFolderPasswordError(error: unknown): Response | undefined {
  if (error instanceof FolderLockedError) {
    return folderLockedResponse(error.protectedPath);
  }

  return undefined;
}
