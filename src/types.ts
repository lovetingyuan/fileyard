export interface Profile {
  email: string;
  avatarUrl: string | null;
}

export interface ProfileResponse {
  success: true;
  profile: Profile;
}

export interface FolderEntry {
  name: string;
  path: string;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  uploadedAt: string;
  contentType: string | null;
}

export type SortKey = 'name' | 'size' | 'uploadedAt';
export type SortOrder = 'asc' | 'desc';

export interface FileListResponse {
  success: true;
  path: string;
  folders: FolderEntry[];
  files: FileEntry[];
}

export interface CreateFolderRequest {
  parentPath: string;
  name: string;
}

export interface FileMutationResponse {
  success: true;
  message: string;
}
