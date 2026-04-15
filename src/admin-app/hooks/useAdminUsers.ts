import useSWR from "swr";
import type { AdminUserListResponse } from "../../types";
import { ApiError, apiRequest } from "../utils/apiRequest";
import { buildAdminUsersApiUrl } from "../utils/adminUsers";

export function useAdminUsers(page: number, pageSize: number) {
  const { data, error, isLoading } = useSWR<AdminUserListResponse, ApiError>(
    buildAdminUsersApiUrl(page, pageSize),
    apiRequest,
  );

  return {
    data,
    error,
    isLoading,
  };
}
