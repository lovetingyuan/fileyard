import type { SWRConfiguration } from "swr";

export const HALF_HOUR_DEDUPE_INTERVAL = 30 * 60 * 1000;

export const stableResourceSWROptions = {
  dedupingInterval: HALF_HOUR_DEDUPE_INTERVAL,
  focusThrottleInterval: HALF_HOUR_DEDUPE_INTERVAL,
} satisfies SWRConfiguration;
