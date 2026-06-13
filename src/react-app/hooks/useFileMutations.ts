import useSWRMutation from "swr/mutation";
import type {
  BatchDeleteRequest,
  BatchFileMutationResponse,
  BatchMoveRequest,
  CreateFolderRequest,
  CreateShareLinkRequest,
  FileMutationResponse,
  MoveRequest,
  RenameRequest,
  ShareLinkResponse,
} from "../../types";
import { ApiError, apiRequest } from "../utils/apiRequest";
import {
  FILE_BATCH_DELETE_ENDPOINT,
  FILE_BATCH_MOVE_ENDPOINT,
  FILE_FOLDERS_ENDPOINT,
  FILE_MOVE_ENDPOINT,
  FILE_OBJECT_ENDPOINT,
  FILE_SHARE_LINKS_ENDPOINT,
} from "./filesApiUrls";

type UploadFileArgs = {
  file: File;
  parentPath: string;
};

type UpdateFileArgs = {
  file: File;
  parentPath: string;
};

export function useCreateFolderMutation() {
  const { trigger, isMutating } = useSWRMutation<
    FileMutationResponse,
    ApiError,
    string,
    CreateFolderRequest
  >(
    FILE_FOLDERS_ENDPOINT,
    (url, { arg }) =>
      apiRequest<FileMutationResponse>(url, {
        method: "POST",
        body: JSON.stringify(arg),
      }),
    {
      throwOnError: true,
    },
  );

  const createFolder = (parentPath: string, name: string) => trigger({ parentPath, name });

  return {
    createFolder,
    isMutating,
  };
}

export function useUploadFileMutation() {
  const { trigger, isMutating } = useSWRMutation<
    FileMutationResponse,
    ApiError,
    string,
    UploadFileArgs
  >(
    FILE_OBJECT_ENDPOINT,
    (url, { arg }) => {
      const params = new URLSearchParams({
        name: arg.file.name,
      });
      if (arg.parentPath) {
        params.set("parentPath", arg.parentPath);
      }

      return apiRequest<FileMutationResponse>(`${url}?${params.toString()}`, {
        method: "PUT",
        headers: arg.file.type
          ? {
              "Content-Type": arg.file.type,
            }
          : undefined,
        body: arg.file,
      });
    },
    {
      throwOnError: true,
    },
  );

  const uploadFile = (file: File, parentPath: string) => trigger({ file, parentPath });

  return {
    uploadFile,
    isMutating,
  };
}

export function useDeleteFileMutation() {
  const { trigger, isMutating } = useSWRMutation<FileMutationResponse, ApiError, string, string>(
    FILE_OBJECT_ENDPOINT,
    (url, { arg }) => {
      const params = new URLSearchParams({ path: arg });
      return apiRequest<FileMutationResponse>(`${url}?${params.toString()}`, {
        method: "DELETE",
      });
    },
    {
      throwOnError: true,
    },
  );

  const deleteFile = (path: string) => trigger(path);

  return {
    deleteFile,
    isMutating,
  };
}

export function useRenameFileMutation() {
  const { trigger, isMutating } = useSWRMutation<
    FileMutationResponse,
    ApiError,
    string,
    RenameRequest
  >(
    FILE_OBJECT_ENDPOINT,
    (url, { arg }) =>
      apiRequest<FileMutationResponse>(url, {
        method: "PATCH",
        body: JSON.stringify(arg),
      }),
    {
      throwOnError: true,
    },
  );

  const renameFile = (path: string, name: string) => trigger({ path, name });

  return {
    renameFile,
    isMutating,
  };
}

export function useDeleteFolderMutation() {
  const { trigger, isMutating } = useSWRMutation<FileMutationResponse, ApiError, string, string>(
    FILE_FOLDERS_ENDPOINT,
    (url, { arg }) => {
      const params = new URLSearchParams({ path: arg });
      return apiRequest<FileMutationResponse>(`${url}?${params.toString()}`, {
        method: "DELETE",
      });
    },
    {
      throwOnError: true,
    },
  );

  const deleteFolder = (path: string) => trigger(path);

  return {
    deleteFolder,
    isMutating,
  };
}

export function useRenameFolderMutation() {
  const { trigger, isMutating } = useSWRMutation<
    FileMutationResponse,
    ApiError,
    string,
    RenameRequest
  >(
    FILE_FOLDERS_ENDPOINT,
    (url, { arg }) =>
      apiRequest<FileMutationResponse>(url, {
        method: "PATCH",
        body: JSON.stringify(arg),
      }),
    {
      throwOnError: true,
    },
  );

  const renameFolder = (path: string, name: string) => trigger({ path, name });

  return {
    renameFolder,
    isMutating,
  };
}

export function useMoveEntryMutation() {
  const { trigger, isMutating } = useSWRMutation<
    FileMutationResponse,
    ApiError,
    string,
    MoveRequest
  >(
    FILE_MOVE_ENDPOINT,
    (url, { arg }) =>
      apiRequest<FileMutationResponse>(url, {
        method: "PATCH",
        body: JSON.stringify(arg),
      }),
    {
      throwOnError: true,
    },
  );

  const moveEntry = (type: MoveRequest["type"], path: string, targetParentPath: string) =>
    trigger({ type, path, targetParentPath });

  return {
    moveEntry,
    isMutating,
  };
}

export function useBatchDeleteEntriesMutation() {
  const { trigger, isMutating } = useSWRMutation<
    BatchFileMutationResponse,
    ApiError,
    string,
    BatchDeleteRequest
  >(
    FILE_BATCH_DELETE_ENDPOINT,
    (url, { arg }) =>
      apiRequest<BatchFileMutationResponse>(url, {
        method: "DELETE",
        body: JSON.stringify(arg),
      }),
    {
      throwOnError: true,
    },
  );

  const batchDeleteEntries = (targets: BatchDeleteRequest["targets"]) => trigger({ targets });

  return {
    batchDeleteEntries,
    isMutating,
  };
}

export function useBatchMoveEntriesMutation() {
  const { trigger, isMutating } = useSWRMutation<
    BatchFileMutationResponse,
    ApiError,
    string,
    BatchMoveRequest
  >(
    FILE_BATCH_MOVE_ENDPOINT,
    (url, { arg }) =>
      apiRequest<BatchFileMutationResponse>(url, {
        method: "PATCH",
        body: JSON.stringify(arg),
      }),
    {
      throwOnError: true,
    },
  );

  const batchMoveEntries = (targets: BatchMoveRequest["targets"], targetParentPath: string) =>
    trigger({ targets, targetParentPath });

  return {
    batchMoveEntries,
    isMutating,
  };
}

export function useCreateShareLinkMutation() {
  const { trigger, isMutating } = useSWRMutation<
    ShareLinkResponse,
    ApiError,
    string,
    CreateShareLinkRequest
  >(
    FILE_SHARE_LINKS_ENDPOINT,
    (url, { arg }) =>
      apiRequest<ShareLinkResponse>(url, {
        method: "POST",
        body: JSON.stringify(arg),
      }),
    {
      throwOnError: true,
    },
  );

  const createShareLink = (
    paths: string | string[],
    expiresInSeconds: CreateShareLinkRequest["expiresInSeconds"],
    password?: string,
  ) =>
    trigger({
      ...(Array.isArray(paths) ? { paths } : { path: paths }),
      expiresInSeconds,
      ...(password ? { password } : {}),
    });

  return {
    createShareLink,
    isMutating,
  };
}

export function useUpdateFileMutation() {
  const { trigger, isMutating } = useSWRMutation<
    FileMutationResponse,
    ApiError,
    string,
    UpdateFileArgs
  >(
    FILE_OBJECT_ENDPOINT,
    (url, { arg }) => {
      const params = new URLSearchParams({
        name: arg.file.name,
        overwrite: "true",
      });
      if (arg.parentPath) {
        params.set("parentPath", arg.parentPath);
      }

      return apiRequest<FileMutationResponse>(`${url}?${params.toString()}`, {
        method: "PUT",
        headers: arg.file.type
          ? {
              "Content-Type": arg.file.type,
            }
          : undefined,
        body: arg.file,
      });
    },
    {
      throwOnError: true,
    },
  );

  const updateFile = (file: File, parentPath: string) => trigger({ file, parentPath });

  return {
    updateFile,
    isMutating,
  };
}
