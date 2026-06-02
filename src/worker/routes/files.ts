import { Hono } from "hono";
import type { AppContext } from "../context";
import {
  downloadFile,
  deleteFile,
  previewFile,
  renameFile,
  uploadFile,
} from "./fileObjectHandlers";
import { getDirectoryStats, getUploadLimits, listFiles } from "./fileListHandlers";
import { listFolderTree, moveEntry } from "./fileMoveHandlers";
import { batchDeleteEntries, batchMoveEntries } from "./fileBatchHandlers";
import { createFolder, deleteFolder, renameFolder } from "./folderHandlers";

const files = new Hono<AppContext>();

files.get("/api/files/upload-limits", getUploadLimits);
files.get("/api/files", listFiles);
files.get("/api/files/stats", getDirectoryStats);
files.get("/api/files/folder-tree", listFolderTree);
files.patch("/api/files/move", moveEntry);
files.delete("/api/files/batch-delete", batchDeleteEntries);
files.patch("/api/files/batch-move", batchMoveEntries);
files.post("/api/files/folders", createFolder);
files.delete("/api/files/folders", deleteFolder);
files.patch("/api/files/folders", renameFolder);
files.put("/api/files/object", uploadFile);
files.patch("/api/files/object", renameFile);
files.get("/api/files/object", downloadFile);
files.get("/api/files/preview", previewFile);
files.delete("/api/files/object", deleteFile);

export default files;
