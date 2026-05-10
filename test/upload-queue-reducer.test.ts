import { describe, expect, it } from "vitest";
import type { UploadQueueItem } from "../src/types";
import {
  createFolderEnsureer,
  appendUploadQueueItems,
  countUploadQueueStats,
  getActiveUploadItemsInFolder,
  getUploadQueuePanelState,
  getUploadQueueSummary,
  resetFailedUploadItem,
  updateUploadQueueItem,
} from "../src/react-app/hooks/useUploadQueue";

function item(
  id: string,
  status: UploadQueueItem["status"],
  targetPath = `${id}.txt`,
): UploadQueueItem {
  return {
    id,
    file: new File(["x"], `${id}.txt`),
    displayPath: targetPath,
    targetPath,
    parentPath: targetPath.includes("/") ? targetPath.split("/").slice(0, -1).join("/") : "",
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

  it("appends newly selected uploads without replacing active queue items", () => {
    const activeItems = [item("a", "uploading"), item("b", "queued")];
    const newItems = [item("c", "queued")];

    const next = appendUploadQueueItems(activeItems, newItems);

    expect(next.map((queueItem) => queueItem.id)).toEqual(["a", "b", "c"]);
    expect(next[0]).toBe(activeItems[0]);
    expect(next[1]).toBe(activeItems[1]);
    expect(next[2]).toBe(newItems[0]);
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

  it("finds only active uploads inside the requested folder path", () => {
    const matches = getActiveUploadItemsInFolder(
      [
        item("queued-child", "queued", "docs/queued.txt"),
        item("preparing-child", "preparing", "docs/nested/preparing.txt"),
        item("uploading-child", "uploading", "docs/uploading.txt"),
        item("same-prefix", "uploading", "docs-archive/uploading.txt"),
        item("done-child", "success", "docs/done.txt"),
        item("failed-child", "failed", "docs/failed.txt"),
        item("canceled-child", "canceled", "docs/canceled.txt"),
      ],
      "docs",
    );

    expect(matches.map((match) => match.id)).toEqual([
      "queued-child",
      "preparing-child",
      "uploading-child",
    ]);
  });

  it("hides the progress panel after every upload succeeds", () => {
    const panelState = getUploadQueuePanelState([item("a", "success"), item("b", "success")]);

    expect(panelState).toMatchObject({
      completed: 2,
      isComplete: true,
      hasTerminalIssues: false,
      shouldShowPanel: false,
    });
  });

  it("hides the progress panel after every remaining upload is canceled", () => {
    const panelState = getUploadQueuePanelState([item("a", "canceled"), item("b", "canceled")]);

    expect(panelState).toMatchObject({
      canceled: 2,
      isComplete: true,
      hasTerminalIssues: true,
      shouldShowPanel: false,
    });
  });
});
