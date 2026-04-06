import type { FileEntry } from "../../types";
import { Dialog } from "./Dialog";
import { formatBytes, formatDetailedDate } from "../utils/fileFormatters";

interface FileDetailsModalProps {
  file: FileEntry | null;
  onClose: () => void;
}

const detailItems = (file: FileEntry) => [
  {
    label: "名称",
    value: file.name,
  },
  {
    label: "路径",
    value: file.path,
    valueClassName: "break-all font-mono text-xs sm:text-sm",
  },
  {
    label: "大小",
    value: `${formatBytes(file.size)} (${file.size.toLocaleString()} 字节)`,
  },
  {
    label: "时间",
    value: formatDetailedDate(file.uploadedAt),
  },
];

export function FileDetailsModal({ file, onClose }: FileDetailsModalProps) {
  if (!file) {
    return null;
  }

  return (
    <Dialog
      isOpen
      title="文件详情"
      onClose={onClose}
      cancelText="关闭"
      showConfirmButton={false}
      boxClassName="max-w-md bg-base-100 p-5 shadow-sm"
      closeButtonAriaLabel="关闭文件详情弹窗"
      cancelButtonClassName="btn btn-sm btn-primary"
    >
      <>
        <ul className="space-y-3">
          {detailItems(file).map((item) => (
            <li key={item.label} className="flex items-start gap-1 text-sm">
              <span className="w-12 shrink-0 text-base-content/60">{item.label}：</span>
              <div
                className={`min-w-0 flex-1 font-medium text-base-content ${item.valueClassName ?? ""}`}
              >
                {item.value}
              </div>
            </li>
          ))}
        </ul>
      </>
    </Dialog>
  );
}
