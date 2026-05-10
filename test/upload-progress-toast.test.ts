import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UploadProgressToast } from "../src/react-app/components/UploadProgressToast";

describe("UploadProgressToast", () => {
  it("renders a compact progress-bar toast for a single file upload", () => {
    const markup = renderToStaticMarkup(
      createElement(UploadProgressToast, {
        fileName: "large-video.mp4",
        progress: 42,
        onCancel: () => undefined,
      }),
    );

    expect(markup).toContain("large-video.mp4");
    expect(markup).toContain("42%");
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="42"');
    expect(markup).toContain("progress progress-primary");
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="取消上传 large-video.mp4"');
    expect(markup).toContain(">取消</button>");
  });
});
