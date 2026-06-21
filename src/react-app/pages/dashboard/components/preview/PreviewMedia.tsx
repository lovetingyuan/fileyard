import { useState, type SyntheticEvent } from "react";
import type { FileEntry } from "../../../../../types";
import {
  STANDARD_AUDIO_CLASS_NAME,
  STANDARD_VIDEO_CLASS_NAME,
} from "../../../../components/previewModalLayout";
import { cn } from "../../../../utils/cn";
import { PreviewUnsupportedMessage } from "./PreviewUnsupportedMessage";
import {
  formatImageOriginalDimensions,
  type ImageOriginalDimensions,
} from "./previewImageDimensions";
import { PREVIEW_MEDIA_VOLUME_STORAGE_KEY } from "./previewLimits";

const EMPTY_CAPTIONS_TRACK_SRC = "data:text/vtt;charset=utf-8,WEBVTT%0A";

type ImagePreviewLoadState = {
  dimensions?: ImageOriginalDimensions;
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
  const originalDimensions =
    loadState.previewUrl === previewUrl && loadStatus === "loaded" ? loadState.dimensions : null;

  if (loadStatus === "error") {
    return <PreviewUnsupportedMessage reason="图片加载失败，请稍后重试" />;
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-2",
        isFullscreen ? "h-full w-full" : "max-w-full",
        !isFullscreen && loadStatus === "loading" && "min-h-40 w-[min(24rem,80vw)]",
      )}
    >
      {originalDimensions ? (
        <p className="w-full text-xs text-base-content/70 text-right">
          {formatImageOriginalDimensions(originalDimensions)}
        </p>
      ) : null}
      <div
        className={cn(
          "relative flex min-h-0 max-w-full items-center justify-center",
          isFullscreen && "h-full w-full flex-1",
        )}
      >
        {loadStatus === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="loading loading-spinner loading-lg text-primary"
              aria-label="图片加载中"
            />
          </div>
        ) : null}
        <img
          src={previewUrl}
          alt={file.name}
          onLoad={(event) =>
            setLoadState({
              dimensions: {
                height: event.currentTarget.naturalHeight,
                width: event.currentTarget.naturalWidth,
              },
              previewUrl,
              status: "loaded",
            })
          }
          onError={() => setLoadState({ previewUrl, status: "error" })}
          className={cn(
            "block h-auto w-auto max-w-full object-contain rounded",
            isFullscreen ? "max-h-full" : "max-h-[calc(70vh-1.5rem)]",
            loadStatus === "loading" && "opacity-0",
          )}
        />
      </div>
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
      aria-label="Video preview"
      controls
      onVolumeChange={handlePreviewMediaVolumeChange}
      className={cn(isFullscreen ? "max-h-full max-w-full rounded" : STANDARD_VIDEO_CLASS_NAME)}
    >
      <track kind="captions" src={EMPTY_CAPTIONS_TRACK_SRC} label="Captions" />
    </video>
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
      className={cn(
        isFullscreen ? "flex h-full items-center justify-center" : "flex justify-center py-8",
      )}
    >
      <audio
        ref={restoreStoredPreviewMediaVolume}
        src={previewUrl}
        aria-label="Audio preview"
        controls
        onVolumeChange={handlePreviewMediaVolumeChange}
        className={STANDARD_AUDIO_CLASS_NAME}
      >
        <track kind="captions" src={EMPTY_CAPTIONS_TRACK_SRC} label="Captions" />
      </audio>
    </div>
  );
}
