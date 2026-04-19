import { describe, expect, it } from "vitest";
import type { UploadQueueItem } from "../src/types";
import {
  createFolderEnsureer,
  countUploadQueueStats,
  getUploadQueueSummary,
  resetFailedUploadItem,
  updateUploadQueueItem,
} from "../src/react-app/hooks/useUploadQueue";

function item(id: string, status: UploadQueueItem["status"]): UploadQueueItem {
  return {
    id,
    file: new File(["x"], `${id}.txt`),
    displayPath: `${id}.txt`,
    targetPath: `${id}.txt`,
    parentPath: "",
    name: `${id}.txt`,
    size: 1,
    progress: status === "success" ? 100 : 0,
    status,
    errorMessage: null,
  };
}

describe("upload queue reducer helpers", () => {
  it("counts remaining and failed states for the toolbar and modal", () => {
    const stats = countUploadQueueStats([
      item("a", "queued"),
      item("b", "uploading"),
      item("c", "failed"),
      item("d", "oversized"),
      item("e", "duplicate"),
      item("f", "canceled"),
      item("g", "success"),
    ]);

    expect(stats).toEqual({
      total: 7,
      remaining: 2,
      failed: 3,
      active: 2,
      hasVisibleStatus: true,
    });
  });

  it("returns the upload-in-progress summary before failure-only summaries", () => {
    expect(getUploadQueueSummary([item("a", "queued"), item("b", "failed")])).toBe(
      "上传中，点击查看详情",
    );
    expect(getUploadQueueSummary([item("a", "failed"), item("b", "duplicate")])).toBe(
      "2 文件上传失败",
    );
    expect(getUploadQueueSummary([item("a", "success")])).toBeNull();
  });

  it("updates a single item without replacing the rest of the queue", () => {
    const queue = [item("a", "queued"), item("b", "queued")];
    const next = updateUploadQueueItem(queue, "b", {
      status: "uploading",
      progress: 50,
    });

    expect(next[0]).toBe(queue[0]);
    expect(next[1]).toMatchObject({ id: "b", status: "uploading", progress: 50 });
  });

  it("resets only failed items for retry", () => {
    expect(resetFailedUploadItem(item("a", "failed"))).toMatchObject({
      status: "queued",
      progress: 0,
      errorMessage: null,
    });
    expect(resetFailedUploadItem(item("b", "duplicate")).status).toBe("duplicate");
  });

  it("deduplicates folder creation requests across a batch", async () => {
    const calls: Array<{ parentPath: string; name: string }> = [];
    const ensureParentFolders = createFolderEnsureer(async (parentPath, name) => {
      calls.push({ parentPath, name });
    });

    await Promise.all([
      ensureParentFolders("albums/Photos/2026", () => false),
      ensureParentFolders("albums/Photos/2026", () => false),
      ensureParentFolders("albums/Photos/raw", () => false),
    ]);

    expect(calls).toEqual([
      { parentPath: "", name: "albums" },
      { parentPath: "albums", name: "Photos" },
      { parentPath: "albums/Photos", name: "2026" },
      { parentPath: "albums/Photos", name: "raw" },
    ]);
  });
});
