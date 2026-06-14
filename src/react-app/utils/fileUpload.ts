import type {
  FileMutationResponse,
  MultipartUploadCreateRequest,
  MultipartUploadCreateResponse,
  MultipartUploadPart,
  MultipartUploadPartResponse,
} from "../../types";
import { getFolderUnlockHeadersForPath } from "./folderUnlockTokens";

type UploadFileWithProgressArgs = {
  file: File;
  parentPath: string;
  onProgress: (progress: number) => void;
};

type UploadTask = {
  promise: Promise<FileMutationResponse>;
  cancel: () => void;
};

const FILE_OBJECT_ENDPOINT = "/api/files/object";
const MULTIPART_ENDPOINT = "/api/files/multipart";
const MULTIPART_PART_ENDPOINT = "/api/files/multipart/part";
const MULTIPART_COMPLETE_ENDPOINT = "/api/files/multipart/complete";

type ErrorPayload = {
  error?: string;
  message?: string;
};

export class FileUploadError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "FileUploadError";
    this.status = status;
    this.data = data;
  }
}

export class UploadCanceledError extends Error {
  readonly isCanceled = true;

  constructor() {
    super("Upload canceled");
    this.name = "UploadCanceledError";
  }
}

function hasErrorPayload(value: unknown): value is ErrorPayload {
  return typeof value === "object" && value !== null;
}

function parseResponse(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (hasErrorPayload(data) && typeof data.error === "string") {
    return data.error;
  }
  if (hasErrorPayload(data) && typeof data.message === "string") {
    return data.message;
  }
  return fallback;
}

async function parseFetchResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  return parseResponse(text);
}

async function requestJson<T>(input: RequestInfo | URL, init: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: init.credentials ?? "include",
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(init.headers)),
    },
  });
  const data = await parseFetchResponse(response);

  if (!response.ok) {
    throw new FileUploadError(
      getErrorMessage(data, response.statusText || "Request failed"),
      response.status,
      data,
    );
  }

  return data as T;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function buildObjectUploadUrl(file: File, parentPath: string): string {
  const params = new URLSearchParams({ name: file.name });
  if (parentPath) {
    params.set("parentPath", parentPath);
  }
  return `${FILE_OBJECT_ENDPOINT}?${params.toString()}`;
}

function uploadSinglePutWithProgress({
  file,
  parentPath,
  onProgress,
}: UploadFileWithProgressArgs): UploadTask {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<FileMutationResponse>((resolve, reject) => {
    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    });

    xhr.onload = () => {
      const data = parseResponse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as FileMutationResponse);
        return;
      }
      reject(
        new FileUploadError(
          getErrorMessage(data, xhr.statusText || "Upload failed"),
          xhr.status,
          data,
        ),
      );
    };

    xhr.onerror = () => {
      reject(new FileUploadError("Network error while uploading", xhr.status, null));
    };

    xhr.onabort = () => {
      reject(new UploadCanceledError());
    };

    xhr.open("PUT", buildObjectUploadUrl(file, parentPath));
    xhr.withCredentials = true;
    if (file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    }
    const unlockHeaders = getFolderUnlockHeadersForPath(parentPath);
    for (const [key, value] of Object.entries(unlockHeaders ?? {})) {
      xhr.setRequestHeader(key, value);
    }
    xhr.send(file);
  });

  return {
    promise,
    cancel: () => xhr.abort(),
  };
}

async function createMultipartUpload(
  file: File,
  parentPath: string,
  signal: AbortSignal,
): Promise<MultipartUploadCreateResponse> {
  const body: MultipartUploadCreateRequest = {
    parentPath,
    name: file.name,
    size: file.size,
    contentType: file.type || null,
  };

  return requestJson<MultipartUploadCreateResponse>(MULTIPART_ENDPOINT, {
    method: "POST",
    headers: getFolderUnlockHeadersForPath(parentPath),
    body: JSON.stringify(body),
    signal,
  });
}

async function completeMultipartUpload(
  uploadId: string,
  parts: MultipartUploadPart[],
  parentPath: string,
  signal: AbortSignal,
): Promise<FileMutationResponse> {
  return requestJson<FileMutationResponse>(MULTIPART_COMPLETE_ENDPOINT, {
    method: "POST",
    headers: getFolderUnlockHeadersForPath(parentPath),
    body: JSON.stringify({ uploadId, parts }),
    signal,
  });
}

async function abortMultipartUpload(uploadId: string): Promise<void> {
  await fetch(`${MULTIPART_ENDPOINT}?${new URLSearchParams({ uploadId }).toString()}`, {
    method: "DELETE",
    credentials: "include",
  });
}

function uploadMultipartPart({
  uploadId,
  partNumber,
  chunk,
  onProgress,
  setActiveXhr,
}: {
  chunk: Blob;
  onProgress: (loadedBytes: number) => void;
  partNumber: number;
  setActiveXhr: (xhr: XMLHttpRequest | null) => void;
  uploadId: string;
}): Promise<MultipartUploadPartResponse> {
  const xhr = new XMLHttpRequest();
  setActiveXhr(xhr);

  return new Promise<MultipartUploadPartResponse>((resolve, reject) => {
    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }
      onProgress(Math.min(chunk.size, event.loaded));
    });

    xhr.onload = () => {
      setActiveXhr(null);
      const data = parseResponse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as MultipartUploadPartResponse);
        return;
      }
      reject(
        new FileUploadError(
          getErrorMessage(data, xhr.statusText || "Upload failed"),
          xhr.status,
          data,
        ),
      );
    };

    xhr.onerror = () => {
      setActiveXhr(null);
      reject(new FileUploadError("Network error while uploading", xhr.status, null));
    };

    xhr.onabort = () => {
      setActiveXhr(null);
      reject(new UploadCanceledError());
    };

    const params = new URLSearchParams({
      uploadId,
      partNumber: String(partNumber),
    });
    xhr.open("PUT", `${MULTIPART_PART_ENDPOINT}?${params.toString()}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.send(chunk);
  });
}

export function uploadFileWithProgress(args: UploadFileWithProgressArgs): UploadTask {
  if (args.file.size === 0) {
    return uploadSinglePutWithProgress(args);
  }

  const controller = new AbortController();
  let activeXhr: XMLHttpRequest | null = null;
  let canceled = false;
  let uploadId: string | null = null;

  const promise = (async () => {
    const uploadedParts: MultipartUploadPart[] = [];
    let completedBytes = 0;

    try {
      const upload = await createMultipartUpload(args.file, args.parentPath, controller.signal);
      uploadId = upload.uploadId;

      for (let index = 0; index < upload.partCount; index++) {
        if (canceled) {
          throw new UploadCanceledError();
        }

        const start = index * upload.partSize;
        const end = Math.min(start + upload.partSize, args.file.size);
        const chunk = args.file.slice(start, end);
        const part = await uploadMultipartPart({
          uploadId: upload.uploadId,
          partNumber: index + 1,
          chunk,
          setActiveXhr: (xhr) => {
            activeXhr = xhr;
          },
          onProgress: (loadedBytes) => {
            args.onProgress(
              Math.min(100, Math.round(((completedBytes + loadedBytes) / args.file.size) * 100)),
            );
          },
        });
        completedBytes += chunk.size;
        uploadedParts.push(part.part);
      }

      return await completeMultipartUpload(
        upload.uploadId,
        uploadedParts,
        args.parentPath,
        controller.signal,
      );
    } catch (error) {
      if (uploadId) {
        await abortMultipartUpload(uploadId).catch(() => undefined);
      }
      if (error instanceof UploadCanceledError || canceled || isAbortError(error)) {
        throw new UploadCanceledError();
      }
      throw error;
    }
  })();

  return {
    promise,
    cancel: () => {
      canceled = true;
      controller.abort();
      activeXhr?.abort();
    },
  };
}
