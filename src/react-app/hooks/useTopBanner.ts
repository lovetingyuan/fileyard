import useSWR from "swr";
import type { TopBannerResponse } from "../../types";
import { ApiError, apiRequest } from "../utils/apiRequest";
import { stableResourceSWROptions } from "./stableResourceSWR";

const TOP_BANNER_KEY = "/api/top-banner";
const TOP_BANNER_SWR_OPTIONS = {
  ...stableResourceSWROptions,
};

async function fetchTopBanner() {
  return apiRequest<TopBannerResponse>(TOP_BANNER_KEY);
}

export function useTopBanner() {
  const { data, error, isLoading } = useSWR<TopBannerResponse, ApiError>(
    TOP_BANNER_KEY,
    fetchTopBanner,
    TOP_BANNER_SWR_OPTIONS,
  );

  return {
    banner: data?.banner ?? null,
    error,
    isLoading,
  };
}
