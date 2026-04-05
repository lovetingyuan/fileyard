import { Icon } from "@iconify/react";

type DeleteTarget = {
  type: "file" | "folder";
  name: string;
};

interface DeleteConfirmModalProps {
  target: DeleteTarget | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  target,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!target) return null;

  const title = target.type === "file" ? "删除文件" : "删除文件夹";
  const description =
    target.type === "file"
      ? `确认删除 “${target.name}” 吗？此操作无法撤销。`
      : `确认删除文件夹 “${target.name}” 吗？此操作无法撤销。`;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md border border-error/10 bg-base-100">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-error/12 text-error">
              <Icon icon="mdi:alert-circle-outline" className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-bold">{title}</h3>
              <p className="text-sm leading-6 text-base-content/70">{description}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="关闭删除确认弹窗"
          >
            <Icon icon="mdi:close" className="h-5 w-5" />
          </button>
        </div>

        <div className="modal-action mt-6">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={onClose}
            disabled={isDeleting}
          >
            取消
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-error text-error-content ${isDeleting ? "loading" : ""}`}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "删除中..." : "确认删除"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" onClick={onClose} disabled={isDeleting}>
          close
        </button>
      </form>
    </dialog>
  );
}
