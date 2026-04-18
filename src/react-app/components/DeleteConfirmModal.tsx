import MdiAlertCircleOutline from "~icons/mdi/alert-circle-outline";
import { Dialog } from "./Dialog";

type DeleteTarget = {
  type: "file" | "folder";
  name: string;
};

interface DeleteConfirmModalProps {
  target: DeleteTarget | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmModal({ target, onClose, onConfirm }: DeleteConfirmModalProps) {
  if (!target) {
    return null;
  }

  const title = target.type === "file" ? "删除文件" : "删除文件夹";
  const description =
    target.type === "file"
      ? `确认删除 “${target.name}” 吗？此操作无法撤销。`
      : `确认删除文件夹 “${target.name}” 吗？此操作无法撤销。`;

  return (
    <Dialog
      isOpen
      title={title}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmText="确认删除"
      confirmPendingText="删除中..."
      boxClassName="max-w-md border border-error/10 bg-base-100"
      closeButtonAriaLabel="关闭删除确认弹窗"
      confirmButtonClassName="btn btn-sm btn-error text-error-content"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-error/12 text-error">
          <MdiAlertCircleOutline className="h-5 w-5" />
        </span>
        <p className="text-sm leading-6 text-base-content/70">{description}</p>
      </div>
    </Dialog>
  );
}
