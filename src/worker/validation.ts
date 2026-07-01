import type {
  BatchDeleteRequest,
  BatchMoveRequest,
  CreateArchiveDownloadRequest,
  CreateFolderRequest,
  CreateShareLinkRequest,
  MoveRequest,
  MultipartUploadCompleteRequest,
  MultipartUploadCreateRequest,
  MultipartUploadPart,
  RemoveFolderPasswordRequest,
  RenameRequest,
  SetFolderPasswordRequest,
  SortKey,
  SortOrder,
  VerifyFolderPasswordRequest,
  VerifySharePasswordRequest,
} from "../types";
import { SHARE_DURATION_OPTIONS } from "../types";
import type { Context } from "hono";
import { validator } from "hono/validator";
import type { AppContext } from "./context";
import { jsonError } from "./utils/response";

const SORT_KEYS = new Set<SortKey>(["name", "size", "uploadedAt"]);
const SORT_ORDERS = new Set<SortOrder>(["asc", "desc"]);

export type FileListQuery = {
  path?: string;
  sort: SortKey;
  order: SortOrder;
};

export type OptionalPathQuery = {
  path?: string;
};

export type PathQuery = {
  path: string;
};

export type UploadObjectQuery = {
  name: string;
  parentPath?: string;
  overwrite: boolean;
};

export type MultipartPartQuery = {
  uploadId: string;
  partNumber: string;
};

export type UploadIdQuery = {
  uploadId: string;
};

export type ShareIdParam = {
  id: string;
};

export type AdminUsersQuery = {
  page?: string;
  pageSize?: string;
};

type QueryValue = Record<string, string | string[]>;
type ValidationTarget = "json" | "param" | "query";
type ValidRequest = {
  valid: (target: ValidationTarget) => unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function isBatchTarget(value: unknown): value is BatchDeleteRequest["targets"][number] {
  return (
    isRecord(value) &&
    (value.type === "file" || value.type === "folder") &&
    typeof value.path === "string"
  );
}

function isMultipartPart(value: unknown): value is MultipartUploadPart {
  return (
    isRecord(value) &&
    typeof value.partNumber === "number" &&
    Number.isInteger(value.partNumber) &&
    value.partNumber > 0 &&
    typeof value.etag === "string" &&
    value.etag.length > 0
  );
}

function getSingleQueryValue(query: QueryValue, key: string): string | undefined {
  const value = query[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function invalidResponse(message: string) {
  return jsonError(null as never, message, 400);
}

function jsonBody<T>(parse: (value: unknown) => T | null) {
  return validator("json", (value) => parse(value) ?? invalidResponse("Invalid request body"));
}

function queryParams<T>(parse: (value: QueryValue) => T | null) {
  return validator("query", (value) => {
    const parsed = parse(value as QueryValue);
    return parsed ?? invalidResponse("Invalid query parameters");
  });
}

function routeParams<T>(parse: (value: QueryValue) => T | null) {
  return validator("param", (value) => {
    const parsed = parse(value as QueryValue);
    return parsed ?? invalidResponse("Invalid route parameters");
  });
}

function getValidated<T>(c: Context<AppContext>, target: ValidationTarget): T {
  return (c.req as unknown as ValidRequest).valid(target) as T;
}

export function getValidatedJson<T>(c: Context<AppContext>): T {
  return getValidated<T>(c, "json");
}

export function getValidatedQuery<T>(c: Context<AppContext>): T {
  return getValidated<T>(c, "query");
}

export function getValidatedParam<T>(c: Context<AppContext>): T {
  return getValidated<T>(c, "param");
}

function parseCreateFolderRequest(value: unknown): CreateFolderRequest | null {
  if (
    !isRecord(value) ||
    typeof value.parentPath !== "string" ||
    typeof value.name !== "string" ||
    !isOptionalBoolean(value.ensure)
  ) {
    return null;
  }

  return {
    parentPath: value.parentPath,
    name: value.name,
    ...(value.ensure === undefined ? {} : { ensure: value.ensure }),
  };
}

function parseSetFolderPasswordRequest(value: unknown): SetFolderPasswordRequest | null {
  if (!isRecord(value) || typeof value.path !== "string" || typeof value.password !== "string") {
    return null;
  }

  return {
    path: value.path,
    password: value.password,
  };
}

function parseVerifyFolderPasswordRequest(value: unknown): VerifyFolderPasswordRequest | null {
  if (!isRecord(value) || typeof value.path !== "string" || typeof value.password !== "string") {
    return null;
  }

  return {
    path: value.path,
    password: value.password,
  };
}

function parseRemoveFolderPasswordRequest(value: unknown): RemoveFolderPasswordRequest | null {
  if (!isRecord(value) || typeof value.path !== "string") {
    return null;
  }

  return {
    path: value.path,
  };
}

function parseRenameRequest(value: unknown): RenameRequest | null {
  if (!isRecord(value) || typeof value.path !== "string" || typeof value.name !== "string") {
    return null;
  }

  return {
    path: value.path,
    name: value.name,
  };
}

function parseMoveRequest(value: unknown): MoveRequest | null {
  if (
    !isRecord(value) ||
    (value.type !== "file" && value.type !== "folder") ||
    typeof value.path !== "string" ||
    typeof value.targetParentPath !== "string"
  ) {
    return null;
  }

  return {
    type: value.type,
    path: value.path,
    targetParentPath: value.targetParentPath,
  };
}

function parseBatchDeleteRequest(value: unknown): BatchDeleteRequest | null {
  if (!isRecord(value) || !Array.isArray(value.targets) || !value.targets.every(isBatchTarget)) {
    return null;
  }

  return {
    targets: value.targets,
  };
}

function parseBatchMoveRequest(value: unknown): BatchMoveRequest | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.targets) ||
    !value.targets.every(isBatchTarget) ||
    typeof value.targetParentPath !== "string"
  ) {
    return null;
  }

  return {
    targets: value.targets,
    targetParentPath: value.targetParentPath,
  };
}

function parseCreateArchiveDownloadRequest(value: unknown): CreateArchiveDownloadRequest | null {
  if (!isRecord(value) || !Array.isArray(value.targets) || !value.targets.every(isBatchTarget)) {
    return null;
  }

  return {
    targets: value.targets,
  };
}

function parseCreateShareLinkRequest(value: unknown): CreateShareLinkRequest | null {
  const hasPath = isRecord(value) && typeof value.path === "string";
  const hasPaths =
    isRecord(value) &&
    Array.isArray(value.paths) &&
    value.paths.every((path) => typeof path === "string");

  if (
    !isRecord(value) ||
    (!hasPath && !hasPaths) ||
    typeof value.expiresInSeconds !== "number" ||
    !isOptionalString(value.password) ||
    !SHARE_DURATION_OPTIONS.includes(
      value.expiresInSeconds as CreateShareLinkRequest["expiresInSeconds"],
    )
  ) {
    return null;
  }

  return {
    ...(hasPath ? { path: value.path as string } : {}),
    ...(hasPaths ? { paths: value.paths as string[] } : {}),
    expiresInSeconds: value.expiresInSeconds as CreateShareLinkRequest["expiresInSeconds"],
    ...(value.password === undefined ? {} : { password: value.password }),
  };
}

function parseVerifySharePasswordRequest(value: unknown): VerifySharePasswordRequest | null {
  if (!isRecord(value) || typeof value.password !== "string") {
    return null;
  }

  return {
    password: value.password,
  };
}

function parseMultipartUploadCreateRequest(value: unknown): MultipartUploadCreateRequest | null {
  if (
    !isRecord(value) ||
    typeof value.parentPath !== "string" ||
    typeof value.name !== "string" ||
    typeof value.size !== "number" ||
    !Number.isInteger(value.size) ||
    value.size < 0 ||
    !(typeof value.contentType === "string" || value.contentType === null) ||
    !isOptionalBoolean(value.overwrite)
  ) {
    return null;
  }

  return {
    parentPath: value.parentPath,
    name: value.name,
    size: value.size,
    contentType: value.contentType,
    ...(value.overwrite === undefined ? {} : { overwrite: value.overwrite }),
  };
}

function parseMultipartUploadCompleteRequest(
  value: unknown,
): MultipartUploadCompleteRequest | null {
  if (
    !isRecord(value) ||
    typeof value.uploadId !== "string" ||
    value.uploadId.length === 0 ||
    !Array.isArray(value.parts) ||
    !value.parts.every(isMultipartPart)
  ) {
    return null;
  }

  return {
    uploadId: value.uploadId,
    parts: value.parts,
  };
}

function parseFileListQuery(query: QueryValue): FileListQuery | null {
  const path = getSingleQueryValue(query, "path");
  const sort = getSingleQueryValue(query, "sort") ?? "uploadedAt";
  const order = getSingleQueryValue(query, "order") ?? "desc";

  if (
    !isOptionalString(path) ||
    !SORT_KEYS.has(sort as SortKey) ||
    !SORT_ORDERS.has(order as SortOrder)
  ) {
    return null;
  }

  return {
    ...(path === undefined ? {} : { path }),
    sort: sort as SortKey,
    order: order as SortOrder,
  };
}

function parseOptionalPathQuery(query: QueryValue): OptionalPathQuery | null {
  const path = getSingleQueryValue(query, "path");
  return isOptionalString(path) ? (path === undefined ? {} : { path }) : null;
}

function parsePathQuery(query: QueryValue): PathQuery | null {
  const path = getSingleQueryValue(query, "path");
  return isString(path) && path.length > 0 ? { path } : null;
}

function parseUploadObjectQuery(query: QueryValue): UploadObjectQuery | null {
  const name = getSingleQueryValue(query, "name");
  const parentPath = getSingleQueryValue(query, "parentPath");
  const overwrite = getSingleQueryValue(query, "overwrite");

  if (
    !isString(name) ||
    name.length === 0 ||
    !isOptionalString(parentPath) ||
    !(overwrite === undefined || overwrite === "true" || overwrite === "false")
  ) {
    return null;
  }

  return {
    name,
    ...(parentPath === undefined ? {} : { parentPath }),
    overwrite: overwrite === "true",
  };
}

function parseUploadIdQuery(query: QueryValue): UploadIdQuery | null {
  const uploadId = getSingleQueryValue(query, "uploadId");
  return isString(uploadId) && uploadId.length > 0 ? { uploadId } : null;
}

function parseMultipartPartQuery(query: QueryValue): MultipartPartQuery | null {
  const uploadId = getSingleQueryValue(query, "uploadId");
  const partNumber = getSingleQueryValue(query, "partNumber");

  return isString(uploadId) &&
    uploadId.length > 0 &&
    isString(partNumber) &&
    /^[1-9]\d*$/u.test(partNumber)
    ? { uploadId, partNumber }
    : null;
}

function parseShareIdParam(params: QueryValue): ShareIdParam | null {
  const id = getSingleQueryValue(params, "id");
  return isString(id) && id.trim().length > 0 ? { id } : null;
}

function parseAdminUsersQuery(query: QueryValue): AdminUsersQuery | null {
  const page = getSingleQueryValue(query, "page");
  const pageSize = getSingleQueryValue(query, "pageSize");

  if (
    !(page === undefined || /^[1-9]\d*$/u.test(page)) ||
    !(pageSize === undefined || /^[1-9]\d*$/u.test(pageSize))
  ) {
    return null;
  }

  return {
    ...(page === undefined ? {} : { page }),
    ...(pageSize === undefined ? {} : { pageSize }),
  };
}

export const createFolderJsonValidator = jsonBody(parseCreateFolderRequest);
export const setFolderPasswordJsonValidator = jsonBody(parseSetFolderPasswordRequest);
export const verifyFolderPasswordJsonValidator = jsonBody(parseVerifyFolderPasswordRequest);
export const removeFolderPasswordJsonValidator = jsonBody(parseRemoveFolderPasswordRequest);
export const renameJsonValidator = jsonBody(parseRenameRequest);
export const moveJsonValidator = jsonBody(parseMoveRequest);
export const batchDeleteJsonValidator = jsonBody(parseBatchDeleteRequest);
export const batchMoveJsonValidator = jsonBody(parseBatchMoveRequest);
export const createArchiveDownloadJsonValidator = jsonBody(parseCreateArchiveDownloadRequest);
export const createShareLinkJsonValidator = jsonBody(parseCreateShareLinkRequest);
export const verifySharePasswordJsonValidator = jsonBody(parseVerifySharePasswordRequest);
export const multipartCreateJsonValidator = jsonBody(parseMultipartUploadCreateRequest);
export const multipartCompleteJsonValidator = jsonBody(parseMultipartUploadCompleteRequest);

export const fileListQueryValidator = queryParams(parseFileListQuery);
export const optionalPathQueryValidator = queryParams(parseOptionalPathQuery);
export const pathQueryValidator = queryParams(parsePathQuery);
export const uploadObjectQueryValidator = queryParams(parseUploadObjectQuery);
export const multipartPartQueryValidator = queryParams(parseMultipartPartQuery);
export const uploadIdQueryValidator = queryParams(parseUploadIdQuery);
export const adminUsersQueryValidator = queryParams(parseAdminUsersQuery);

export const shareIdParamValidator = routeParams(parseShareIdParam);
