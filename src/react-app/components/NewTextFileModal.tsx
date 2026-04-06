import { useState } from "react";
import { Dialog } from "./Dialog";

interface NewTextFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filename: string, content: string) => Promise<void>;
}

export function NewTextFileModal({ isOpen, onClose, onSave }: NewTextFileModalProps) {
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");

  const handleSave = async () => {
    const trimmedFilename = filename.trim();
    if (!trimmedFilename) {
      return;
    }
    await onSave(trimmedFilename, content);
    setFilename("");
    setContent("");
  };

  const handleClose = () => {
    setFilename("");
    setContent("");
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="新建文本文件"
      onClose={handleClose}
      onConfirm={handleSave}
      confirmText="保存"
      confirmPendingText="保存中..."
      confirmDisabled={!filename.trim()}
      boxClassName="flex w-[95vw] max-w-3xl flex-col"
      bodyClassName="flex flex-1 flex-col gap-4"
      closeButtonAriaLabel="关闭新建文本文件弹窗"
    >
      {({ isConfirming }) => (
        <>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">文件名</span>
            </label>
            <input
              type="text"
              placeholder="example.txt"
              className="input input-bordered w-full"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              disabled={isConfirming}
              autoFocus
            />
          </div>

          <div className="form-control flex-1">
            <label className="label">
              <span className="label-text text-sm">文件内容</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-80 font-mono text-sm"
              placeholder="输入文本内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isConfirming}
            />
          </div>
        </>
      )}
    </Dialog>
  );
}
