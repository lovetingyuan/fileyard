import { SHARE_DURATION_OPTIONS, type ShareDurationOption } from "../../types";
import type { AppBindings } from "../context";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const SHARE_ID_BYTES = 16;
const PASSWORD_VERIFIER_PURPOSE = "fileyard:share-password:v1";
const DOWNLOAD_TICKET_SIGNATURE_PURPOSE = "fileyard:share-download-ticket:v1";
const DOWNLOAD_TICKET_VERSION = 1;
const DOWNLOAD_TICKET_TTL_MS = 10 * 60 * 1000;
export const MAX_SHARE_FILE_COUNT = 50;

export type ShareFileTokenEntry = {
  path: string;
  fileName: string;
  size: number;
  etag: string;
};

export type SharePasswordVerifier = {
  passwordProtected: boolean;
  passwordSalt?: string | null;
  passwordVerifier?: string | null;
};

export type SharePasswordVerifierFields = {
  passwordProtected: true;
  passwordSalt: string;
  passwordVerifier: string;
};

type ShareDownloadTicketPayload = {
  v: typeof DOWNLOAD_TICKET_VERSION;
  type: "share-download";
  shareIdDigest: string;
  exp: number;
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

function createRandomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
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

function parseShareDownloadTicketPayload(value: unknown): ShareDownloadTicketPayload | null {
  if (
    !isRecord(value) ||
    value.v !== DOWNLOAD_TICKET_VERSION ||
    value.type !== "share-download" ||
    typeof value.shareIdDigest !== "string" ||
    typeof value.exp !== "number" ||
    !Number.isInteger(value.exp)
  ) {
    return null;
  }

  return {
    v: DOWNLOAD_TICKET_VERSION,
    type: "share-download",
    shareIdDigest: value.shareIdDigest,
    exp: value.exp,
  };
}

export function createShareId(): string {
  return createRandomBase64Url(SHARE_ID_BYTES);
}

export async function createSharePasswordVerifier(
  env: AppBindings,
  password: string,
): Promise<SharePasswordVerifierFields> {
  const passwordSalt = createRandomBase64Url(SHARE_ID_BYTES);
  return {
    passwordProtected: true,
    passwordSalt,
    passwordVerifier: await createPasswordVerifier(env, passwordSalt, password.trim()),
  };
}

export async function verifySharePassword(
  env: AppBindings,
  verifier: SharePasswordVerifier,
  password: string,
): Promise<boolean> {
  if (!verifier.passwordProtected || !verifier.passwordSalt || !verifier.passwordVerifier) {
    return false;
  }

  const expectedVerifier = await createPasswordVerifier(
    env,
    verifier.passwordSalt,
    password.trim(),
  );
  return timingSafeEqualString(expectedVerifier, verifier.passwordVerifier);
}

export async function getShareIdDigest(shareId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(shareId));
  return encodeBase64Url(new Uint8Array(digest));
}

export async function createShareDownloadTicket(
  env: AppBindings,
  shareId: string,
  shareExpiresAt: number,
  now = Date.now(),
): Promise<string> {
  return createSignedToken(
    env,
    {
      v: DOWNLOAD_TICKET_VERSION,
      type: "share-download",
      exp: Math.min(shareExpiresAt, now + DOWNLOAD_TICKET_TTL_MS),
      shareIdDigest: await getShareIdDigest(shareId),
    } satisfies ShareDownloadTicketPayload,
    DOWNLOAD_TICKET_SIGNATURE_PURPOSE,
  );
}

export async function isShareDownloadTicketValid(
  env: AppBindings,
  shareId: string,
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
    parseShareDownloadTicketPayload,
  );
  if (!ticketPayload || now >= ticketPayload.exp) {
    return false;
  }

  return timingSafeEqualString(ticketPayload.shareIdDigest, await getShareIdDigest(shareId));
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

export function buildSharePageUrl(origin: string, shareId: string): string {
  return `${origin}/share/${encodeURIComponent(shareId)}`;
}

export function buildShareDownloadUrl(
  origin: string,
  shareId: string,
  ticket?: string,
  fileIndex?: number,
): string {
  const url = `${origin}/api/share-links/${encodeURIComponent(shareId)}/files/${fileIndex ?? 0}`;
  if (!ticket) {
    return url;
  }

  const params = new URLSearchParams();
  params.set("ticket", ticket);
  return `${url}?${params.toString()}`;
}

export function isShareExpired(expiresAt: Date, now = Date.now()): boolean {
  return now >= expiresAt.getTime();
}
