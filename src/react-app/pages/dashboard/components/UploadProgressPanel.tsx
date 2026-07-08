import MdiCloseCircleOutline from "~icons/mdi/close-circle-outline";
import MdiClose from "~icons/mdi/close";
import MdiChevronDown from "~icons/mdi/chevron-down";
import MdiChevronUp from "~icons/mdi/chevron-up";
import { Fragment, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useAppStore } from "../../../store";
import { cn } from "../../../utils/cn";
import type { UploadQueuePanelState } from "../hooks/useUploadQueue";
import {
  cancelRemainingDashboardUploads,
  closeDashboardUploadPanel,
  getUploadQueuePanelState,
  minimizeDashboardUploadPanel,
  restoreDashboardUploadPanel,
  shouldAutoMinimizeUploadPanel,
} from "../hooks/useUploadQueue";
import { UploadFolderProgressRow } from "./UploadFolderProgressRow";
import { UploadProgressRow } from "./UploadProgressRow";
import { getUploadProgressDisplayRows } from "./uploadProgressDisplay";

const PANEL_SURFACE_CLASS =
  "rounded-box border border-[color-mix(in_oklab,var(--color-info)_38%,var(--color-base-300))] bg-[color-mix(in_oklab,var(--color-info)_14%,var(--color-base-100))] p-3 text-base-content shadow-2xl shadow-base-content/20";
const PANEL_SUBTITLE_CLASS_NAME = "min-w-0 truncate text-xs";
const UPLOAD_RESULT_TOAST_ID = "dashboard-upload-result";

function getPanelTitle(panelState: UploadQueuePanelState): string {
  if (panelState.isComplete) {
    return panelState.hasTerminalIssues ? "上传已结束" : "上传完成";
  }
  return "上传中";
}

function getPanelSubtitle(panelState: UploadQueuePanelState): string {
  const segments = [`${panelState.completed}/${panelState.total} 已完成`];
  if (panelState.remaining > 0) {
    segments.push(`${panelState.remaining} 个进行中`);
  }
  if (panelState.failed > 0) {
    segments.push(`${panelState.failed} 个失败`);
  }
  if (panelState.canceled > 0) {
    segments.push(`${panelState.canceled} 个已取消`);
  }
  return segments.join(" · ");
}

function getUploadResultToastMessage(panelState: UploadQueuePanelState): string {
  if (!panelState.hasTerminalIssues) {
    return panelState.completed === 1 ? "文件上传完成" : `${panelState.completed} 个文件上传完成`;
  }

  if (panelState.completed > 0) {
    return `上传已结束：${panelState.completed} 个成功，${panelState.failed} 个失败`;
  }

  return panelState.failed === 1 ? "文件上传失败" : `${panelState.failed} 个文件上传失败`;
}

function PanelSubtitle({ panelState }: { panelState: UploadQueuePanelState }) {
  const segments = [
    {
      className: "text-success",
      text: `${panelState.completed}/${panelState.total} 已完成`,
    },
  ];
  if (panelState.remaining > 0) {
    segments.push({
      className: "text-base-content/60",
      text: `${panelState.remaining} 个进行中`,
    });
  }
  if (panelState.failed > 0) {
    segments.push({
      className: "text-error",
      text: `${panelState.failed} 个失败`,
    });
  }
  if (panelState.canceled > 0) {
    segments.push({
      className: "text-warning",
      text: `${panelState.canceled} 个已取消`,
    });
  }

  return segments.map((segment, index) => (
    <Fragment key={segment.text}>
      {index > 0 ? <span className="mx-1 text-base-content/40">·</span> : null}
      <span className={segment.className}>{segment.text}</span>
    </Fragment>
  ));
}

export function UploadProgressPanel() {
  const { isUploadPanelMinimized, uploadQueue: items } = useAppStore();
  const panelState = getUploadQueuePanelState(items);
  const isMinimized = isUploadPanelMinimized;
  const previousPanelStateRef = useRef(panelState);

  useEffect(() => {
    const previousPanelState = previousPanelStateRef.current;
    if (shouldAutoMinimizeUploadPanel(previousPanelState, panelState)) {
      minimizeDashboardUploadPanel();
      const message = getUploadResultToastMessage(panelState);

      if (panelState.hasTerminalIssues) {
        toast.error(message, { id: UPLOAD_RESULT_TOAST_ID });
      } else {
        toast.success(message, { id: UPLOAD_RESULT_TOAST_ID });
      }
    }
    previousPanelStateRef.current = panelState;
  }, [
    panelState.completed,
    panelState.failed,
    panelState.hasTerminalIssues,
    panelState.isComplete,
    panelState.total,
  ]);

  if (!panelState.shouldShowPanel) {
    return null;
  }

  const totalProgress = Math.max(0, Math.min(100, Math.round(panelState.totalProgress)));
  const visibleRows = getUploadProgressDisplayRows(items);
  const canClose = panelState.isComplete;

  if (isMinimized) {
    return (
      <aside
        className={cn(
          "fixed right-4 bottom-4 z-50 w-[min(16rem,calc(100vw-2rem))]",
          PANEL_SURFACE_CLASS,
        )}
        aria-label="上传进度"
      >
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className="min-w-0 flex-1 truncate text-sm font-semibold"
              title={getPanelTitle(panelState)}
            >
              {getPanelTitle(panelState)}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square"
                onClick={restoreDashboardUploadPanel}
                aria-label="展开上传进度面板"
              >
                <MdiChevronUp className="h-4 w-4" />
              </button>
              {canClose ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={closeDashboardUploadPanel}
                  aria-label="关闭上传进度面板"
                >
                  <MdiClose className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className={PANEL_SUBTITLE_CLASS_NAME} title={getPanelSubtitle(panelState)}>
              <PanelSubtitle panelState={panelState} />
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">{totalProgress}%</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "fixed right-4 bottom-4 z-50 w-[min(24rem,calc(100vw-2rem))]",
        PANEL_SURFACE_CLASS,
      )}
      aria-label="上传进度"
    >
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className="min-w-0 flex-1 truncate text-sm font-semibold"
            title={getPanelTitle(panelState)}
          >
            {getPanelTitle(panelState)}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            {panelState.canCancelAll ? (
              <button
                type="button"
                className="btn btn-error btn-outline btn-xs"
                onClick={cancelRemainingDashboardUploads}
              >
                <MdiCloseCircleOutline className="h-4 w-4" />
                全部取消
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square"
              onClick={minimizeDashboardUploadPanel}
              aria-label="折叠上传进度面板"
            >
              <MdiChevronDown className="h-4 w-4" />
            </button>
            {canClose ? (
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square"
                onClick={closeDashboardUploadPanel}
                aria-label="关闭上传进度面板"
              >
                <MdiClose className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mx-2 mt-2">
          <p className={PANEL_SUBTITLE_CLASS_NAME} title={getPanelSubtitle(panelState)}>
            <PanelSubtitle panelState={panelState} />
          </p>
          <span className="shrink-0 text-sm font-semibold tabular-nums">{totalProgress}%</span>
        </div>
      </div>

      {visibleRows.length > 0 ? (
        <ul className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
          {visibleRows.map((row) =>
            row.kind === "folder" ? (
              <UploadFolderProgressRow key={`folder:${row.folderPath}`} row={row} />
            ) : (
              <UploadProgressRow key={row.item.id} item={row.item} />
            ),
          )}
        </ul>
      ) : null}
    </aside>
  );
}
