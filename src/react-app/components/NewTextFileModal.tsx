import { Icon } from "@iconify/react";
import { useState } from "react";

interface NewTextFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filename: string, content: string) => void;
  isSaving: boolean;
}

export function NewTextFileModal({ isOpen, onClose, onSave, isSaving }: NewTextFileModalProps) {
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmedFilename = filename.trim();
    if (!trimmedFilename) return;
    onSave(trimmedFilename, content);
  };

  const handleClose = () => {
    setFilename("");
    setContent("");
    onClose();
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-[95vw] max-w-3xl flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="font-bold text-base">新建文本文件</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={handleClose}
            disabled={isSaving}
          >
            <Icon icon="mdi:close" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 flex-1">
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
              disabled={isSaving}
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
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="modal-action">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={handleClose}
            disabled={isSaving}
          >
            取消
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-primary ${isSaving ? "loading" : ""}`}
            onClick={handleSave}
            disabled={!filename.trim() || isSaving}
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" onClick={handleClose} disabled={isSaving}>
          close
        </button>
      </form>
    </dialog>
  );
}
