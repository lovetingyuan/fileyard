import type { SWRConfiguration } from "swr";

const SWR_RETRY_INTERVAL_MS = 1500;
const SWR_MAX_RETRY_COUNT = 2;

function getErrorStatus(error: Error) {
  if (!("status" in error)) {
    return null;
  }

  return typeof error.status === "number" ? error.status : null;
}

function shouldRetryRequestError(error: Error) {
  const status = getErrorStatus(error);

  return status === null || status >= 500;
}

export const appSWRConfig = {
  shouldRetryOnError: shouldRetryRequestError,
  errorRetryCount: SWR_MAX_RETRY_COUNT,
  errorRetryInterval: SWR_RETRY_INTERVAL_MS,
  onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
    if (!shouldRetryRequestError(error) || retryCount > SWR_MAX_RETRY_COUNT) {
      return;
    }

    setTimeout(() => {
      void revalidate({ retryCount });
    }, SWR_RETRY_INTERVAL_MS);
  },
} satisfies SWRConfiguration;
