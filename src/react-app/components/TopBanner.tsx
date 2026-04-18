import MdiClose from "~icons/mdi/close";
import { useState } from "react";
import type { TopBannerMessage } from "../../types";
import { useTopBanner } from "../hooks/useTopBanner";

const DISMISSED_TOP_BANNER_DATE_KEY = "fileyard:top-banner:dismissed-date";

function getBrowserStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function readDismissedTopBannerDate(storage: Pick<Storage, "getItem"> | null) {
  try {
    return storage?.getItem(DISMISSED_TOP_BANNER_DATE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function writeDismissedTopBannerDate(
  storage: Pick<Storage, "setItem"> | null,
  date: string,
) {
  try {
    storage?.setItem(DISMISSED_TOP_BANNER_DATE_KEY, date);
  } catch {
    // Ignore storage failures so the banner remains usable in restricted browsers.
  }
}

export function shouldShowTopBanner(banner: TopBannerMessage | null, dismissedDate: string | null) {
  return Boolean(
    banner?.date && banner.contentHtml.trim() && dismissedDate !== banner.date,
  );
}

type TopBannerViewProps = {
  date: string;
  messageHtml: string;
  onDismiss: () => void;
};

export function TopBannerView({ date, messageHtml, onDismiss }: TopBannerViewProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-banner-date={date}
      className="relative z-20 bg-info text-info-content shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-2 text-left text-sm leading-6 sm:px-6">
        <div
          className="min-w-0 flex-1 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:opacity-80 [&_p]:m-0 [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: messageHtml }}
        />
        <button
          type="button"
          aria-label="关闭顶部横幅"
          className="btn btn-ghost btn-xs btn-circle shrink-0 text-info-content hover:bg-info-content/10"
          onClick={onDismiss}
        >
          <MdiClose className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function TopBanner() {
  const { banner, error, isLoading } = useTopBanner();
  const [dismissedDate, setDismissedDate] = useState<string | null>(() =>
    readDismissedTopBannerDate(getBrowserStorage()),
  );

  if (!banner || isLoading || error || !shouldShowTopBanner(banner, dismissedDate)) {
    return null;
  }

  const contentHtml = banner.contentHtml.trim();

  return (
    <TopBannerView
      date={banner.date}
      messageHtml={contentHtml}
      onDismiss={() => {
        writeDismissedTopBannerDate(getBrowserStorage(), banner.date);
        setDismissedDate(banner.date);
      }}
    />
  );
}
