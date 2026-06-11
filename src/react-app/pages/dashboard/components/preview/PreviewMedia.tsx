import { useState, type SyntheticEvent } from "react";
import clsx from "clsx/lite";
import type { FileEntry } from "../../../../../types";
import {
  STANDARD_AUDIO_CLASS_NAME,
  STANDARD_VIDEO_CLASS_NAME,
} from "../../../../components/previewModalLayout";
import { PreviewUnsupportedMessage } from "./PreviewUnsupportedMessage";
import { PREVIEW_MEDIA_VOLUME_STORAGE_KEY } from "./previewLimits";

type ImagePreviewLoadState = {
  previewUrl: string;
  status: "error" | "loaded" | "loading";
};

function getBrowserLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredPreviewMediaVolume(): number | null {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return null;
  }

  let storedVolume: string | null;
  try {
    storedVolume = storage.getItem(PREVIEW_MEDIA_VOLUME_STORAGE_KEY);
  } catch {
    return null;
  }

  if (storedVolume === null) {
    return null;
  }

  const volume = Number(storedVolume);
  return Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : null;
}

function writeStoredPreviewMediaVolume(volume: number): void {
  const storage = getBrowserLocalStorage();
  if (!storage || !Number.isFinite(volume)) {
    return;
  }

  const normalizedVolume = Math.min(1, Math.max(0, volume));

  try {
    storage.setItem(PREVIEW_MEDIA_VOLUME_STORAGE_KEY, String(normalizedVolume));
  } catch {
    // Ignore storage failures so private browsing or quota errors do not break preview playback.
  }
}

function restoreStoredPreviewMediaVolume(element: HTMLMediaElement | null): void {
  if (!element) {
    return;
  }

  const storedVolume = readStoredPreviewMediaVolume();
  if (storedVolume !== null) {
    element.volume = storedVolume;
  }
}

function handlePreviewMediaVolumeChange(event: SyntheticEvent<HTMLMediaElement>): void {
  writeStoredPreviewMediaVolume(event.currentTarget.volume);
}

export function ImagePreview({
  file,
  previewUrl,
  isFullscreen,
}: {
  file: FileEntry;
  isFullscreen: boolean;
  previewUrl: string;
}) {
  const [loadState, setLoadState] = useState<ImagePreviewLoadState>({
    previewUrl,
    status: "loading",
  });
  const loadStatus = loadState.previewUrl === previewUrl ? loadState.status : "loading";

  if (loadStatus === "error") {
    return <PreviewUnsupportedMessage reason="图片加载失败，请稍后重试" />;
  }

  return (
    <div
      className={clsx(
        "relative flex items-center justify-center",
        isFullscreen ? "h-full w-full" : "max-w-full",
        !isFullscreen && loadStatus === "loading" && "min-h-40 w-[min(24rem,80vw)]",
      )}
    >
      {loadStatus === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" aria-label="图片加载中" />
        </div>
      ) : null}
      <img
        src={previewUrl}
        alt={file.name}
        onLoad={() => setLoadState({ previewUrl, status: "loaded" })}
        onError={() => setLoadState({ previewUrl, status: "error" })}
        className={clsx(
          "block h-auto w-auto max-w-full object-contain rounded",
          isFullscreen ? "max-h-full" : "max-h-[70vh]",
          loadStatus === "loading" && "opacity-0",
        )}
      />
    </div>
  );
}

export function VideoPreview({
  previewUrl,
  isFullscreen,
}: {
  isFullscreen: boolean;
  previewUrl: string;
}) {
  return (
    <video
      ref={restoreStoredPreviewMediaVolume}
      src={previewUrl}
      controls
      onVolumeChange={handlePreviewMediaVolumeChange}
      className={isFullscreen ? "max-h-full max-w-full rounded" : STANDARD_VIDEO_CLASS_NAME}
    />
  );
}

export function AudioPreview({
  previewUrl,
  isFullscreen,
}: {
  isFullscreen: boolean;
  previewUrl: string;
}) {
  return (
    <div
      className={
        isFullscreen ? "flex h-full items-center justify-center" : "flex justify-center py-8"
      }
    >
      <audio
        ref={restoreStoredPreviewMediaVolume}
        src={previewUrl}
        controls
        onVolumeChange={handlePreviewMediaVolumeChange}
        className={STANDARD_AUDIO_CLASS_NAME}
      />
    </div>
  );
}
