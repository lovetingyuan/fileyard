import type { CreateFolderRequest, FileUploadLimitsResponse } from "../../../../types";
import { apiRequest } from "../../../utils/apiRequest";

const FILE_UPLOAD_LIMITS_ENDPOINT = "/api/files/upload-limits";
const FILE_FOLDERS_ENDPOINT = "/api/files/folders";

export async function fetchUploadLimits(): Promise<FileUploadLimitsResponse> {
  return apiRequest<FileUploadLimitsResponse>(FILE_UPLOAD_LIMITS_ENDPOINT);
}

export async function createFolder(parentPath: string, name: string): Promise<void> {
  await apiRequest(FILE_FOLDERS_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ parentPath, name, ensure: true } satisfies CreateFolderRequest),
  });
}
