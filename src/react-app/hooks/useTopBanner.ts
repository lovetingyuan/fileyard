import useSWR from "swr";
import type { TopBannerResponse } from "../../types";
import { ApiError, apiRequest } from "../utils/apiRequest";

const TOP_BANNER_KEY = "/api/top-banner";

async function fetchTopBanner() {
  return apiRequest<TopBannerResponse>(TOP_BANNER_KEY);
}

export function useTopBanner() {
  const { data, error, isLoading } = useSWR<TopBannerResponse, ApiError>(
    TOP_BANNER_KEY,
    fetchTopBanner,
    {
      shouldRetryOnError: false,
    },
  );

  return {
    banner: data?.banner ?? null,
    error,
    isLoading,
  };
}
