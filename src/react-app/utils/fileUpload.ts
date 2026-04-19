import type { FileMutationResponse } from "../../types";

type UploadFileWithProgressArgs = {
  file: File;
  parentPath: string;
  onProgress: (progress: number) => void;
};

type UploadTask = {
  promise: Promise<FileMutationResponse>;
  cancel: () => void;
};

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

export function uploadFileWithProgress({
  file,
  parentPath,
  onProgress,
}: UploadFileWithProgressArgs): UploadTask {
  const xhr = new XMLHttpRequest();
  const params = new URLSearchParams({ name: file.name });
  if (parentPath) {
    params.set("parentPath", parentPath);
  }

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

    xhr.open("PUT", `/api/files/object?${params.toString()}`);
    xhr.withCredentials = true;
    if (file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    }
    xhr.send(file);
  });

  return {
    promise,
    cancel: () => xhr.abort(),
  };
}
