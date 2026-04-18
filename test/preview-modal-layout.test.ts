import { describe, expect, it } from "vitest";
import {
  STANDARD_AUDIO_CLASS_NAME,
  STANDARD_PDF_CLASS_NAME,
  STANDARD_TEXT_CLASS_NAME,
  STANDARD_VIDEO_CLASS_NAME,
  getDialogBoxClassName,
  getPreviewContentWrapperClassName,
  getPreviewModalBoxClassName,
} from "../src/react-app/components/previewModalLayout";

describe("preview modal layout helpers", () => {
  it("keeps default dialog width mode unchanged", () => {
    expect(getDialogBoxClassName("default")).toBe("modal-box");
  });

  it("switches dialog into content width mode", () => {
    expect(getDialogBoxClassName("content")).toBe("modal-box !w-fit");
  });

  it("uses capped but stable preview modal box sizing", () => {
    expect(getPreviewModalBoxClassName()).toBe(
      "flex max-h-[95vh] min-w-[min(32rem,95vw)] !max-w-[95vw] flex-col",
    );
  });

  it("lets fullscreen preview fill the app viewport instead of browser fullscreen", () => {
    expect(getPreviewModalBoxClassName(true)).toBe(
      "flex h-[100dvh] w-screen !max-h-none !max-w-none flex-col rounded-none",
    );
  });

  it("uses a content-sized wrapper for media previews", () => {
    expect(getPreviewContentWrapperClassName("image", false)).toBe("mx-auto w-fit max-w-full");
  });

  it("uses a stable document viewport for pdf previews", () => {
    expect(getPreviewContentWrapperClassName("pdf", false)).toBe(
      "mx-auto w-[min(48rem,calc(95vw-4rem))] max-w-full",
    );
  });

  it("uses a stable document viewport while reading text", () => {
    expect(getPreviewContentWrapperClassName("text", false)).toBe(
      "mx-auto w-[min(48rem,calc(95vw-4rem))] max-w-full",
    );
  });

  it("lets document previews fill the available height in fullscreen mode", () => {
    expect(getPreviewContentWrapperClassName("pdf", false, true)).toBe("h-full w-full");
  });

  it("uses a stable full-width wrapper while editing text", () => {
    expect(getPreviewContentWrapperClassName("text", true)).toBe("w-full min-w-0");
  });

  it("does not force standard video previews to full width", () => {
    expect(STANDARD_VIDEO_CLASS_NAME).toBe("max-h-[65vh] max-w-full rounded");
  });

  it("does not force standard audio previews to full width", () => {
    expect(STANDARD_AUDIO_CLASS_NAME).toBe("max-w-full");
  });

  it("lets standard pdf previews fill the document viewport", () => {
    expect(STANDARD_PDF_CLASS_NAME).toBe("w-full rounded border-0 h-[70vh]");
  });

  it("lets standard text previews fill the document viewport", () => {
    expect(STANDARD_TEXT_CLASS_NAME).toBe(
      "w-full overflow-auto text-sm bg-base-200 rounded-box p-4 whitespace-pre max-h-[60vh]",
    );
  });
});
