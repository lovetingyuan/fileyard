import type { FileEntry } from "../../../../types";
import { Dialog } from "../../../components/Dialog";
import { DetailsList } from "../../../components/DetailsList";
import { useAppStore } from "../../../store";
import { formatBytes, formatDetailedDate } from "../../../utils/fileFormatters";
import { closeFileDetails } from "../actions";

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

export function FileDetailsModal() {
  const { currentFile, viewDetail } = useAppStore();

  if (!currentFile || !viewDetail) {
    return null;
  }

  return (
    <Dialog
      isOpen
      title="文件详情"
      onClose={closeFileDetails}
      cancelText="关闭"
      showConfirmButton={false}
      boxClassName="max-w-md bg-base-100 p-5 shadow-sm"
      closeButtonAriaLabel="关闭文件详情弹窗"
      cancelButtonClassName="btn btn-sm btn-primary"
    >
      <DetailsList items={detailItems(currentFile)} />
    </Dialog>
  );
}
