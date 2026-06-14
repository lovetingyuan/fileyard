import useSWRMutation from "swr/mutation";
import type {
  BatchDeleteRequest,
  BatchFileMutationResponse,
  BatchMoveRequest,
  CreateFolderRequest,
  CreateShareLinkRequest,
  FileMutationResponse,
  MoveRequest,
  RemoveFolderPasswordRequest,
  RenameRequest,
  ShareLinkResponse,
  SetFolderPasswordRequest,
  VerifyFolderPasswordRequest,
  VerifyFolderPasswordResponse,
} from "../../types";
import { ApiError, apiRequest } from "../utils/apiRequest";
import { getFolderUnlockHeadersForPath } from "../utils/folderUnlockTokens";
import {
  FILE_BATCH_DELETE_ENDPOINT,
  FILE_BATCH_MOVE_ENDPOINT,
  FILE_FOLDER_PASSWORD_ENDPOINT,
  FILE_FOLDER_PASSWORD_VERIFY_ENDPOINT,
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
        headers: getFolderUnlockHeadersForPath(arg.parentPath),
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
        headers: {
          ...(getFolderUnlockHeadersForPath(arg.parentPath) ?? {}),
          ...(arg.file.type ? { "Content-Type": arg.file.type } : {}),
        },
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
        headers: getFolderUnlockHeadersForPath(arg),
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
        headers: getFolderUnlockHeadersForPath(arg.path),
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
        headers: getFolderUnlockHeadersForPath(arg),
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
        headers: getFolderUnlockHeadersForPath(arg.path),
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
        headers: getFolderUnlockHeadersForPath(arg.targetParentPath),
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
        headers: arg.targets[0]
          ? getFolderUnlockHeadersForPath(arg.targets[0].path)
          : undefined,
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
        headers: getFolderUnlockHeadersForPath(arg.targetParentPath),
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
        headers: {
          ...(getFolderUnlockHeadersForPath(arg.parentPath) ?? {}),
          ...(arg.file.type ? { "Content-Type": arg.file.type } : {}),
        },
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

export function useSetFolderPasswordMutation() {
  const { trigger, isMutating } = useSWRMutation<
    FileMutationResponse,
    ApiError,
    string,
    SetFolderPasswordRequest
  >(
    FILE_FOLDER_PASSWORD_ENDPOINT,
    (url, { arg }) =>
      apiRequest<FileMutationResponse>(url, {
        method: "PUT",
        body: JSON.stringify(arg),
      }),
    {
      throwOnError: true,
    },
  );

  const setFolderPassword = (path: string, password: string) => trigger({ path, password });

  return {
    setFolderPassword,
    isMutating,
  };
}

export function useVerifyFolderPasswordMutation() {
  const { trigger, isMutating } = useSWRMutation<
    VerifyFolderPasswordResponse,
    ApiError,
    string,
    VerifyFolderPasswordRequest
  >(
    FILE_FOLDER_PASSWORD_VERIFY_ENDPOINT,
    (url, { arg }) =>
      apiRequest<VerifyFolderPasswordResponse>(url, {
        method: "POST",
        body: JSON.stringify(arg),
      }),
    {
      throwOnError: true,
    },
  );

  const verifyFolderPassword = (path: string, password: string) => trigger({ path, password });

  return {
    verifyFolderPassword,
    isMutating,
  };
}

export function useRemoveFolderPasswordMutation() {
  const { trigger, isMutating } = useSWRMutation<
    FileMutationResponse,
    ApiError,
    string,
    RemoveFolderPasswordRequest
  >(
    FILE_FOLDER_PASSWORD_ENDPOINT,
    (url, { arg }) =>
      apiRequest<FileMutationResponse>(url, {
        method: "DELETE",
        headers: getFolderUnlockHeadersForPath(arg.path),
        body: JSON.stringify(arg),
      }),
    {
      throwOnError: true,
    },
  );

  const removeFolderPassword = (path: string) => trigger({ path });

  return {
    removeFolderPassword,
    isMutating,
  };
}
