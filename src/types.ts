export interface Profile {
  email: string;
  avatarUrl: string | null;
}

export interface User {
  id: string;
  email: string;
  image: string | null;
  name: string;
  verified: boolean;
  createdAt?: string;
}

export type ThemePreference = "light" | "dark" | "system";

export const SHARE_DURATION_OPTIONS = [600, 1800, 3600, 7200, 86400] as const;

export type ShareDurationOption = (typeof SHARE_DURATION_OPTIONS)[number];

export interface ProfileResponse {
  success: true;
  profile: Profile;
}

export interface AdminUserListItem {
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserListResponse {
  success: true;
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface TopBannerMessage {
  date: string;
  contentHtml: string;
}

export interface TopBannerResponse {
  success: true;
  banner: TopBannerMessage | null;
}

export interface FolderEntry {
  name: string;
  path: string;
  createdAt: string;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  createdAt: string;
  uploadedAt: string;
  contentType: string | null;
}

export type OptimisticFolderEntry = FolderEntry & {
  isOptimistic: true;
};

export type FileOperationTarget = {
  name: string;
  path: string;
};

export type DeleteTarget = FileOperationTarget & {
  type: "file" | "folder";
};

export type NewTextFileDraft = {
  name: string;
  content: string;
};

export type SortKey = "name" | "size" | "uploadedAt";
export type SortOrder = "asc" | "desc";

export interface FileListResponse {
  success: true;
  path: string;
  folders: FolderEntry[];
  files: FileEntry[];
}

export interface DirectoryStatsResponse {
  success: true;
  path: string;
  fileCount: number;
  totalBytes: number;
}

export interface FileUploadLimitsResponse {
  success: true;
  maxFileBytes: number;
  maxBatchBytes: number;
  multipartPartBytes: number;
}

export interface MultipartUploadCreateRequest {
  parentPath: string;
  name: string;
  size: number;
  contentType: string | null;
  overwrite?: boolean;
}

export interface MultipartUploadCreateResponse {
  success: true;
  uploadId: string;
  partSize: number;
  partCount: number;
}

export interface MultipartUploadPart {
  partNumber: number;
  etag: string;
}

export interface MultipartUploadPartResponse {
  success: true;
  part: MultipartUploadPart;
  uploadedBytes: number;
}

export interface MultipartUploadCompleteRequest {
  uploadId: string;
  parts: MultipartUploadPart[];
}

export type UploadQueueStatus =
  | "queued"
  | "preparing"
  | "uploading"
  | "success"
  | "failed"
  | "canceled"
  | "oversized"
  | "duplicate";

export interface UploadQueueItem {
  id: string;
  file: File;
  displayPath: string;
  targetPath: string;
  parentPath: string;
  name: string;
  size: number;
  progress: number;
  status: UploadQueueStatus;
  errorMessage: string | null;
}

export interface CreateFolderRequest {
  parentPath: string;
  name: string;
  ensure?: boolean;
}

export interface FileMutationResponse {
  success: true;
  message: string;
}

export interface CreateShareLinkRequest {
  path: string;
  expiresInSeconds: ShareDurationOption;
}

export interface ShareLinkResponse {
  success: true;
  fileName: string;
  expiresAt: string;
  expiresInSeconds: ShareDurationOption;
  shareUrl: string;
}

export type SharedFileStatus = "active" | "expired" | "missing";

export interface SharedFileMetadataResponse {
  success: true;
  status: SharedFileStatus;
  fileName: string;
  expiresAt: string;
  expiresInSeconds: ShareDurationOption;
  serverNow: string;
  downloadUrl: string | null;
}
