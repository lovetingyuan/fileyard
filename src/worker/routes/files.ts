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
import {
  batchDeleteJsonValidator,
  batchMoveJsonValidator,
  createFolderJsonValidator,
  fileListQueryValidator,
  moveJsonValidator,
  optionalPathQueryValidator,
  pathQueryValidator,
  renameJsonValidator,
  uploadObjectQueryValidator,
} from "../validation";

const files = new Hono<AppContext>();

files.get("/api/files/upload-limits", getUploadLimits);
files.get("/api/files", fileListQueryValidator, listFiles);
files.get("/api/files/stats", optionalPathQueryValidator, getDirectoryStats);
files.get("/api/files/folder-tree", listFolderTree);
files.patch("/api/files/move", moveJsonValidator, moveEntry);
files.delete("/api/files/batch-delete", batchDeleteJsonValidator, batchDeleteEntries);
files.patch("/api/files/batch-move", batchMoveJsonValidator, batchMoveEntries);
files.post("/api/files/folders", createFolderJsonValidator, createFolder);
files.delete("/api/files/folders", pathQueryValidator, deleteFolder);
files.patch("/api/files/folders", renameJsonValidator, renameFolder);
files.put("/api/files/object", uploadObjectQueryValidator, uploadFile);
files.patch("/api/files/object", renameJsonValidator, renameFile);
files.get("/api/files/object", pathQueryValidator, downloadFile);
files.get("/api/files/preview", pathQueryValidator, previewFile);
files.delete("/api/files/object", pathQueryValidator, deleteFile);

export default files;
