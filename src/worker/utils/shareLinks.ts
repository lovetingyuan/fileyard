import { SHARE_DURATION_OPTIONS, type ShareDurationOption } from "../../types";
import type { AppBindings } from "../context";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const LEGACY_SHARE_TOKEN_VERSION = 1;
const SINGLE_FILE_SHARE_TOKEN_VERSION = 2;
const SHARE_TOKEN_VERSION = 3;
const LEGACY_DOWNLOAD_TICKET_VERSION = 1;
const DOWNLOAD_TICKET_VERSION = 2;
const DOWNLOAD_TICKET_TTL_MS = 10 * 60 * 1000;
const SHARE_TOKEN_V2_SIGNATURE_PURPOSE = "fileyard:share-token:v2";
const SHARE_TOKEN_V3_SIGNATURE_PURPOSE = "fileyard:share-token:v3";
const PASSWORD_VERIFIER_PURPOSE = "fileyard:share-password:v1";
const DOWNLOAD_TICKET_SIGNATURE_PURPOSE = "fileyard:share-download-ticket:v1";
export const MAX_SHARE_FILE_COUNT = 50;

type ShareTokenBasePayload = {
  rootDirId: string;
  fileName: string;
  exp: number;
  expiresInSeconds: ShareDurationOption;
  files: ShareFileTokenEntry[];
};

type CurrentShareTokenPayload = ShareTokenBasePayload & {
  v: typeof SHARE_TOKEN_VERSION;
  passwordProtected: boolean;
  passwordSalt?: string;
  passwordVerifier?: string;
};

export type ShareTokenPayload = ShareTokenBasePayload & {
  v:
    | typeof LEGACY_SHARE_TOKEN_VERSION
    | typeof SINGLE_FILE_SHARE_TOKEN_VERSION
    | typeof SHARE_TOKEN_VERSION;
  passwordProtected: boolean;
  passwordSalt?: string;
  passwordVerifier?: string;
};

export type ShareFileTokenEntry = {
  path: string;
  fileName: string;
  size: number;
  etag: string;
};

type LegacySingleFileTokenPayload = Omit<ShareTokenBasePayload, "files"> & {
  path: string;
  etag: string;
};

type CreateShareTokenPayload = Omit<ShareTokenBasePayload, "files"> &
  (
    | {
        files: ShareFileTokenEntry[];
        password?: string | null;
      }
    | {
        path: string;
        etag: string;
        size?: number;
        password?: string | null;
      }
  );

type LegacyShareDownloadTicketPayload = LegacySingleFileTokenPayload & {
  v: typeof LEGACY_DOWNLOAD_TICKET_VERSION;
  type: "share-download";
  shareTokenDigest: string;
};

type ShareDownloadTicketPayload = Omit<ShareTokenBasePayload, "files"> & {
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

function isValidFileSize(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseShareFileEntry(value: unknown): ShareFileTokenEntry | null {
  if (
    !isRecord(value) ||
    typeof value.path !== "string" ||
    typeof value.fileName !== "string" ||
    typeof value.etag !== "string" ||
    !isValidFileSize(value.size)
  ) {
    return null;
  }

  return {
    path: value.path,
    fileName: value.fileName,
    size: value.size,
    etag: value.etag,
  };
}

function parseShareCommonPayload(
  candidate: Record<string, unknown>,
): Omit<ShareTokenBasePayload, "files"> | null {
  if (
    typeof candidate.rootDirId !== "string" ||
    typeof candidate.fileName !== "string" ||
    typeof candidate.exp !== "number" ||
    !Number.isInteger(candidate.exp) ||
    typeof candidate.expiresInSeconds !== "number" ||
    !isShareDurationOption(candidate.expiresInSeconds)
  ) {
    return null;
  }

  return {
    rootDirId: candidate.rootDirId,
    fileName: candidate.fileName,
    exp: candidate.exp,
    expiresInSeconds: candidate.expiresInSeconds,
  };
}

function parseLegacySingleFilePayload(
  value: Record<string, unknown>,
): LegacySingleFileTokenPayload | null {
  const commonPayload = parseShareCommonPayload(value);
  if (!commonPayload || typeof value.path !== "string" || typeof value.etag !== "string") {
    return null;
  }

  return {
    ...commonPayload,
    path: value.path,
    etag: value.etag,
  };
}

function parseShareFilesPayload(value: Record<string, unknown>): ShareFileTokenEntry[] | null {
  if (!Array.isArray(value.files) || value.files.length === 0) {
    return null;
  }

  if (value.files.length > MAX_SHARE_FILE_COUNT) {
    return null;
  }

  const files = value.files.map(parseShareFileEntry);
  return files.every((file): file is ShareFileTokenEntry => Boolean(file)) ? files : null;
}

function createSingleFilePayload(
  payload: LegacySingleFileTokenPayload,
  version: typeof LEGACY_SHARE_TOKEN_VERSION | typeof SINGLE_FILE_SHARE_TOKEN_VERSION,
): ShareTokenBasePayload & {
  v: typeof LEGACY_SHARE_TOKEN_VERSION | typeof SINGLE_FILE_SHARE_TOKEN_VERSION;
} {
  return {
    v: version,
    rootDirId: payload.rootDirId,
    fileName: payload.fileName,
    exp: payload.exp,
    expiresInSeconds: payload.expiresInSeconds,
    files: [
      {
        path: payload.path,
        fileName: payload.fileName,
        size: 0,
        etag: payload.etag,
      },
    ],
  };
}

function parseLegacySharePayload(value: Record<string, unknown>): ShareTokenPayload | null {
  if (value.v !== LEGACY_SHARE_TOKEN_VERSION) {
    return null;
  }

  const basePayload = parseLegacySingleFilePayload(value);
  return basePayload
    ? {
        ...createSingleFilePayload(basePayload, LEGACY_SHARE_TOKEN_VERSION),
        passwordProtected: false,
      }
    : null;
}

function parseSingleFileSharePayload(value: Record<string, unknown>): ShareTokenPayload | null {
  if (value.v !== SINGLE_FILE_SHARE_TOKEN_VERSION || typeof value.passwordProtected !== "boolean") {
    return null;
  }

  const basePayload = parseLegacySingleFilePayload(value);
  if (!basePayload) {
    return null;
  }

  if (!value.passwordProtected) {
    return {
      ...createSingleFilePayload(basePayload, SINGLE_FILE_SHARE_TOKEN_VERSION),
      passwordProtected: false,
    };
  }

  if (typeof value.passwordSalt !== "string" || typeof value.passwordVerifier !== "string") {
    return null;
  }

  return {
    ...createSingleFilePayload(basePayload, SINGLE_FILE_SHARE_TOKEN_VERSION),
    passwordProtected: true,
    passwordSalt: value.passwordSalt,
    passwordVerifier: value.passwordVerifier,
  };
}

function parseCurrentSharePayload(value: Record<string, unknown>): ShareTokenPayload | null {
  if (value.v !== SHARE_TOKEN_VERSION || typeof value.passwordProtected !== "boolean") {
    return null;
  }

  const commonPayload = parseShareCommonPayload(value);
  const files = parseShareFilesPayload(value);
  if (!commonPayload || !files) {
    return null;
  }

  if (!value.passwordProtected) {
    return {
      v: SHARE_TOKEN_VERSION,
      ...commonPayload,
      files,
      passwordProtected: false,
    };
  }

  if (typeof value.passwordSalt !== "string" || typeof value.passwordVerifier !== "string") {
    return null;
  }

  return {
    v: SHARE_TOKEN_VERSION,
    ...commonPayload,
    files,
    passwordProtected: true,
    passwordSalt: value.passwordSalt,
    passwordVerifier: value.passwordVerifier,
  };
}

function parseSharePayload(value: unknown): ShareTokenPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  return (
    parseLegacySharePayload(value) ??
    parseSingleFileSharePayload(value) ??
    parseCurrentSharePayload(value)
  );
}

function parseLegacyDownloadTicketPayload(
  value: Record<string, unknown>,
): LegacyShareDownloadTicketPayload | null {
  if (value.v !== LEGACY_DOWNLOAD_TICKET_VERSION || value.type !== "share-download") {
    return null;
  }

  const basePayload = parseLegacySingleFilePayload(value);
  if (!basePayload || typeof value.shareTokenDigest !== "string") {
    return null;
  }

  return {
    v: LEGACY_DOWNLOAD_TICKET_VERSION,
    type: "share-download",
    ...basePayload,
    shareTokenDigest: value.shareTokenDigest,
  };
}

function parseCurrentDownloadTicketPayload(
  value: Record<string, unknown>,
): ShareDownloadTicketPayload | null {
  if (value.v !== DOWNLOAD_TICKET_VERSION || value.type !== "share-download") {
    return null;
  }

  const commonPayload = parseShareCommonPayload(value);
  if (!commonPayload || typeof value.shareTokenDigest !== "string") {
    return null;
  }

  return {
    v: DOWNLOAD_TICKET_VERSION,
    type: "share-download",
    ...commonPayload,
    shareTokenDigest: value.shareTokenDigest,
  };
}

function parseDownloadTicketPayload(
  value: unknown,
): ShareDownloadTicketPayload | LegacyShareDownloadTicketPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  return parseLegacyDownloadTicketPayload(value) ?? parseCurrentDownloadTicketPayload(value);
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

async function signSharePayload(
  payloadJson: string,
  secret: string,
  version: number,
): Promise<Uint8Array> {
  const purpose =
    version === SINGLE_FILE_SHARE_TOKEN_VERSION
      ? SHARE_TOKEN_V2_SIGNATURE_PURPOSE
      : SHARE_TOKEN_V3_SIGNATURE_PURPOSE;
  return signPurposePayload(purpose, payloadJson, secret);
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

function getCreateShareFiles(payload: CreateShareTokenPayload): ShareFileTokenEntry[] {
  if ("files" in payload) {
    return payload.files;
  }

  return [
    {
      path: payload.path,
      fileName: payload.fileName,
      size: payload.size ?? 0,
      etag: payload.etag,
    },
  ];
}

function assertShareFiles(files: ShareFileTokenEntry[]): void {
  if (files.length === 0) {
    throw new Error("At least one file is required");
  }

  if (files.length > MAX_SHARE_FILE_COUNT) {
    throw new Error(`Cannot share more than ${MAX_SHARE_FILE_COUNT} files`);
  }
}

export async function createShareToken(
  env: AppBindings,
  payload: CreateShareTokenPayload,
): Promise<string> {
  const { password } = payload;
  const normalizedPassword = password?.trim() ?? "";
  const files = getCreateShareFiles(payload);
  assertShareFiles(files);
  const sharePayload: ShareTokenBasePayload = {
    rootDirId: payload.rootDirId,
    fileName: payload.fileName,
    exp: payload.exp,
    expiresInSeconds: payload.expiresInSeconds,
    files,
  };
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
  const signatureBytes = await signSharePayload(payloadJson, getShareSecret(env), tokenPayload.v);

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
        : version === SINGLE_FILE_SHARE_TOKEN_VERSION || version === SHARE_TOKEN_VERSION
          ? await signSharePayload(payloadJson, getShareSecret(env), version)
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
      fileName: payload.fileName,
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
  if (
    !timingSafeEqualString(ticketPayload.shareTokenDigest, shareTokenDigest) ||
    ticketPayload.rootDirId !== payload.rootDirId ||
    ticketPayload.fileName !== payload.fileName
  ) {
    return false;
  }

  if (ticketPayload.v === LEGACY_DOWNLOAD_TICKET_VERSION) {
    const firstFile = payload.files[0];
    return (
      Boolean(firstFile) &&
      ticketPayload.path === firstFile.path &&
      ticketPayload.etag === firstFile.etag
    );
  }

  return true;
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

export function buildShareDownloadUrl(
  origin: string,
  token: string,
  ticket?: string,
  fileIndex?: number,
): string {
  const url = `${origin}/api/share-links/${encodeURIComponent(token)}/download`;
  if (!ticket && fileIndex === undefined) {
    return url;
  }

  const params = new URLSearchParams();
  if (ticket) {
    params.set("ticket", ticket);
  }
  if (fileIndex !== undefined) {
    params.set("file", String(fileIndex));
  }
  return `${url}?${params.toString()}`;
}

export function isShareExpired(payload: ShareTokenPayload, now = Date.now()): boolean {
  return now >= payload.exp;
}
