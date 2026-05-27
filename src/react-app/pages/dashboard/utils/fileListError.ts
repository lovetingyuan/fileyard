import { ApiError } from "../../../utils/apiRequest";

const FOLDER_NOT_FOUND_MESSAGE = "Folder not found";

type ErrorPayload = {
  error?: unknown;
  message?: unknown;
};

function getPayloadMessage(data: unknown): string | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const payload = data as ErrorPayload;
  if (typeof payload.error === "string") {
    return payload.error;
  }
  if (typeof payload.message === "string") {
    return payload.message;
  }
  return null;
}

export function isMissingCurrentPathError(currentPath: string, error: unknown): boolean {
  if (!currentPath || !(error instanceof ApiError) || error.status !== 404) {
    return false;
  }

  return (
    error.message === FOLDER_NOT_FOUND_MESSAGE ||
    getPayloadMessage(error.data) === FOLDER_NOT_FOUND_MESSAGE
  );
}
