import { SHARE_DURATION_OPTIONS, type ShareDurationOption } from "../../types";
import type { AppBindings } from "../context";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const LEGACY_SHARE_TOKEN_VERSION = 1;
const SHARE_TOKEN_VERSION = 2;
const DOWNLOAD_TICKET_VERSION = 1;
const DOWNLOAD_TICKET_TTL_MS = 10 * 60 * 1000;
const SHARE_TOKEN_V2_SIGNATURE_PURPOSE = "fileyard:share-token:v2";
const PASSWORD_VERIFIER_PURPOSE = "fileyard:share-password:v1";
const DOWNLOAD_TICKET_SIGNATURE_PURPOSE = "fileyard:share-download-ticket:v1";

type ShareTokenBasePayload = {
  rootDirId: string;
  path: string;
  fileName: string;
  etag: string;
  exp: number;
  expiresInSeconds: ShareDurationOption;
};

type CurrentShareTokenPayload = ShareTokenBasePayload & {
  v: typeof SHARE_TOKEN_VERSION;
  passwordProtected: boolean;
  passwordSalt?: string;
  passwordVerifier?: string;
};

export type ShareTokenPayload = ShareTokenBasePayload & {
  v: typeof LEGACY_SHARE_TOKEN_VERSION | typeof SHARE_TOKEN_VERSION;
  passwordProtected: boolean;
  passwordSalt?: string;
  passwordVerifier?: string;
};

type CreateShareTokenPayload = ShareTokenBasePayload & {
  password?: string | null;
};

type ShareDownloadTicketPayload = ShareTokenBasePayload & {
  v: typeof DOWNLOAD_TICKET_VERSION;
  type: "share-download";
  shareTokenDigest: string;
};

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
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + padding;
  return base64ToBytes(normalized);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseShareBasePayload(candidate: Record<string, unknown>): ShareTokenBasePayload | null {
  if (
    typeof candidate.rootDirId !== "string" ||
    typeof candidate.path !== "string" ||
    typeof candidate.fileName !== "string" ||
    typeof candidate.etag !== "string" ||
    typeof candidate.exp !== "number" ||
    !Number.isInteger(candidate.exp) ||
    typeof candidate.expiresInSeconds !== "number" ||
    !isShareDurationOption(candidate.expiresInSeconds)
  ) {
    return null;
  }

  return {
    rootDirId: candidate.rootDirId,
    path: candidate.path,
    fileName: candidate.fileName,
    etag: candidate.etag,
    exp: candidate.exp,
    expiresInSeconds: candidate.expiresInSeconds,
  };
}

function parseLegacySharePayload(value: Record<string, unknown>): ShareTokenPayload | null {
  if (value.v !== LEGACY_SHARE_TOKEN_VERSION) {
    return null;
  }

  const basePayload = parseShareBasePayload(value);
  return basePayload
    ? { v: LEGACY_SHARE_TOKEN_VERSION, ...basePayload, passwordProtected: false }
    : null;
}

function parseCurrentSharePayload(value: Record<string, unknown>): ShareTokenPayload | null {
  if (value.v !== SHARE_TOKEN_VERSION || typeof value.passwordProtected !== "boolean") {
    return null;
  }

  const basePayload = parseShareBasePayload(value);
  if (!basePayload) {
    return null;
  }

  if (!value.passwordProtected) {
    return {
      v: SHARE_TOKEN_VERSION,
      ...basePayload,
      passwordProtected: false,
    };
  }

  if (typeof value.passwordSalt !== "string" || typeof value.passwordVerifier !== "string") {
    return null;
  }

  return {
    v: SHARE_TOKEN_VERSION,
    ...basePayload,
    passwordProtected: true,
    passwordSalt: value.passwordSalt,
    passwordVerifier: value.passwordVerifier,
  };
}

function parseSharePayload(value: unknown): ShareTokenPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  return parseLegacySharePayload(value) ?? parseCurrentSharePayload(value);
}

function parseDownloadTicketPayload(value: unknown): ShareDownloadTicketPayload | null {
  if (!isRecord(value) || value.v !== DOWNLOAD_TICKET_VERSION || value.type !== "share-download") {
    return null;
  }

  const basePayload = parseShareBasePayload(value);
  if (!basePayload || typeof value.shareTokenDigest !== "string") {
    return null;
  }

  return {
    v: DOWNLOAD_TICKET_VERSION,
    type: "share-download",
    ...basePayload,
    shareTokenDigest: value.shareTokenDigest,
  };
}

function readPayloadVersion(payloadJson: string): number | null {
  try {
    const value = JSON.parse(payloadJson);
    return isRecord(value) && typeof value.v === "number" ? value.v : null;
  } catch {
    return null;
  }
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

async function signMessage(message: string, secret: string): Promise<Uint8Array> {
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(message));
  return new Uint8Array(signature);
}

function purposeMessage(purpose: string, payload: string): string {
  return `${purpose}\n${payload}`;
}

async function signPurposePayload(
  purpose: string,
  payload: string,
  secret: string,
): Promise<Uint8Array> {
  return signMessage(purposeMessage(purpose, payload), secret);
}

function timingSafeEqualBytes(left: Uint8Array, right: Uint8Array): boolean {
  const lengthsMatch = left.byteLength === right.byteLength;
  return lengthsMatch
    ? crypto.subtle.timingSafeEqual(left, right)
    : !crypto.subtle.timingSafeEqual(left, left);
}

function timingSafeEqualString(left: string, right: string): boolean {
  return timingSafeEqualBytes(textEncoder.encode(left), textEncoder.encode(right));
}

function getShareSecret(env: AppBindings): string {
  const secret = env.SHARE_LINK_SECRET;
  if (!secret) {
    throw new Error("SHARE_LINK_SECRET is not configured");
  }
  return secret;
}

function createRandomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

async function createPasswordVerifier(
  env: AppBindings,
  salt: string,
  password: string,
): Promise<string> {
  const signature = await signPurposePayload(
    PASSWORD_VERIFIER_PURPOSE,
    `${salt}\n${password}`,
    getShareSecret(env),
  );
  return encodeBase64Url(signature);
}

async function signSharePayload(payloadJson: string, secret: string): Promise<Uint8Array> {
  return signPurposePayload(SHARE_TOKEN_V2_SIGNATURE_PURPOSE, payloadJson, secret);
}

async function createSignedToken(
  env: AppBindings,
  payload: unknown,
  purpose: string,
): Promise<string> {
  const payloadJson = JSON.stringify(payload);
  const payloadBytes = textEncoder.encode(payloadJson);
  const signatureBytes = await signPurposePayload(purpose, payloadJson, getShareSecret(env));

  return `${encodeBase64Url(payloadBytes)}.${encodeBase64Url(signatureBytes)}`;
}

async function verifySignedToken<T>(
  env: AppBindings,
  token: string,
  purpose: string,
  parse: (value: unknown) => T | null,
): Promise<T | null> {
  const parts = token.split(".");
  const [encodedPayload, encodedSignature] = parts;
  if (!encodedPayload || !encodedSignature || parts.length !== 2) {
    return null;
  }

  try {
    const payloadBytes = decodeBase64Url(encodedPayload);
    const signatureBytes = decodeBase64Url(encodedSignature);
    const payloadJson = textDecoder.decode(payloadBytes);
    const expectedSignature = await signPurposePayload(purpose, payloadJson, getShareSecret(env));

    if (!timingSafeEqualBytes(signatureBytes, expectedSignature)) {
      return null;
    }

    return parse(JSON.parse(payloadJson));
  } catch {
    return null;
  }
}

export function isShareDurationOption(value: number): value is ShareDurationOption {
  return SHARE_DURATION_OPTIONS.includes(value as ShareDurationOption);
}

export function getShareExpiryTimestamp(
  expiresInSeconds: ShareDurationOption,
  now = Date.now(),
): number {
  return now + expiresInSeconds * 1000;
}

export async function createShareToken(
  env: AppBindings,
  payload: CreateShareTokenPayload,
): Promise<string> {
  const { password, ...sharePayload } = payload;
  const normalizedPassword = password?.trim() ?? "";
  let tokenPayload: CurrentShareTokenPayload;

  if (normalizedPassword) {
    const passwordSalt = createRandomSalt();
    tokenPayload = {
      v: SHARE_TOKEN_VERSION,
      ...sharePayload,
      passwordProtected: true,
      passwordSalt,
      passwordVerifier: await createPasswordVerifier(env, passwordSalt, normalizedPassword),
    };
  } else {
    tokenPayload = {
      v: SHARE_TOKEN_VERSION,
      ...sharePayload,
      passwordProtected: false,
    };
  }

  const payloadJson = JSON.stringify(tokenPayload);
  const payloadBytes = textEncoder.encode(payloadJson);
  const signatureBytes = await signSharePayload(payloadJson, getShareSecret(env));

  return `${encodeBase64Url(payloadBytes)}.${encodeBase64Url(signatureBytes)}`;
}

export async function verifyShareToken(
  env: AppBindings,
  token: string,
): Promise<ShareTokenPayload | null> {
  const parts = token.split(".");
  const [encodedPayload, encodedSignature] = parts;
  if (!encodedPayload || !encodedSignature || parts.length !== 2) {
    return null;
  }

  try {
    const payloadBytes = decodeBase64Url(encodedPayload);
    const signatureBytes = decodeBase64Url(encodedSignature);
    const payloadJson = textDecoder.decode(payloadBytes);
    const version = readPayloadVersion(payloadJson);
    const expectedSignature =
      version === LEGACY_SHARE_TOKEN_VERSION
        ? await signMessage(payloadJson, getShareSecret(env))
        : version === SHARE_TOKEN_VERSION
          ? await signSharePayload(payloadJson, getShareSecret(env))
          : null;

    if (!expectedSignature || !timingSafeEqualBytes(signatureBytes, expectedSignature)) {
      return null;
    }

    return parseSharePayload(JSON.parse(payloadJson));
  } catch {
    return null;
  }
}

export async function verifySharePassword(
  env: AppBindings,
  payload: ShareTokenPayload,
  password: string,
): Promise<boolean> {
  if (!payload.passwordProtected || !payload.passwordSalt || !payload.passwordVerifier) {
    return false;
  }

  const verifier = await createPasswordVerifier(env, payload.passwordSalt, password.trim());
  return timingSafeEqualString(verifier, payload.passwordVerifier);
}

export async function getShareTokenDigest(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(token));
  return encodeBase64Url(new Uint8Array(digest));
}

export async function createShareDownloadTicket(
  env: AppBindings,
  shareToken: string,
  payload: ShareTokenPayload,
  now = Date.now(),
): Promise<string> {
  return createSignedToken(
    env,
    {
      v: DOWNLOAD_TICKET_VERSION,
      type: "share-download",
      rootDirId: payload.rootDirId,
      path: payload.path,
      fileName: payload.fileName,
      etag: payload.etag,
      exp: Math.min(payload.exp, now + DOWNLOAD_TICKET_TTL_MS),
      expiresInSeconds: payload.expiresInSeconds,
      shareTokenDigest: await getShareTokenDigest(shareToken),
    } satisfies ShareDownloadTicketPayload,
    DOWNLOAD_TICKET_SIGNATURE_PURPOSE,
  );
}

export async function isShareDownloadTicketValid(
  env: AppBindings,
  shareToken: string,
  payload: ShareTokenPayload,
  ticket: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!ticket) {
    return false;
  }

  const ticketPayload = await verifySignedToken(
    env,
    ticket,
    DOWNLOAD_TICKET_SIGNATURE_PURPOSE,
    parseDownloadTicketPayload,
  );
  if (!ticketPayload || now >= ticketPayload.exp) {
    return false;
  }

  const shareTokenDigest = await getShareTokenDigest(shareToken);
  return (
    timingSafeEqualString(ticketPayload.shareTokenDigest, shareTokenDigest) &&
    ticketPayload.rootDirId === payload.rootDirId &&
    ticketPayload.path === payload.path &&
    ticketPayload.fileName === payload.fileName &&
    ticketPayload.etag === payload.etag
  );
}

export function resolveAppOrigin(requestUrl: string, env: AppBindings): string {
  if (env.APP_URL) {
    try {
      return new URL(env.APP_URL).origin;
    } catch (error) {
      console.warn("APP_URL is not a valid URL:", error);
    }
  }

  return new URL(requestUrl).origin;
}

export function buildSharePageUrl(origin: string, token: string): string {
  return `${origin}/share/${encodeURIComponent(token)}`;
}

export function buildShareDownloadUrl(origin: string, token: string, ticket?: string): string {
  const url = `${origin}/api/share-links/${encodeURIComponent(token)}/download`;
  if (!ticket) {
    return url;
  }

  const params = new URLSearchParams({ ticket });
  return `${url}?${params.toString()}`;
}

export function isShareExpired(payload: ShareTokenPayload, now = Date.now()): boolean {
  return now >= payload.exp;
}
