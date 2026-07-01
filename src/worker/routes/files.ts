import { Hono } from "hono";
import type { AppContext } from "../context";
import {
  downloadFile,
  deleteFile,
  headDownloadFile,
  previewFile,
  renameFile,
  uploadFile,
} from "./fileObjectHandlers";
import { getDirectoryStats, getUploadLimits, listFiles } from "./fileListHandlers";
import { createArchiveDownloadTicket, downloadArchive } from "./fileArchiveHandlers";
import { listFolderTree, moveEntry } from "./fileMoveHandlers";
import { batchDeleteEntries, batchMoveEntries } from "./fileBatchHandlers";
import {
  checkFolderPasswordSetAllowed,
  createFolder,
  deleteFolder,
  removeFolderAccessPassword,
  renameFolder,
  setFolderAccessPassword,
  verifyFolderAccessPassword,
} from "./folderHandlers";
import {
  batchDeleteJsonValidator,
  batchMoveJsonValidator,
  createArchiveDownloadJsonValidator,
  createFolderJsonValidator,
  fileListQueryValidator,
  moveJsonValidator,
  optionalPathQueryValidator,
  pathQueryValidator,
  removeFolderPasswordJsonValidator,
  renameJsonValidator,
  setFolderPasswordJsonValidator,
  uploadObjectQueryValidator,
  verifyFolderPasswordJsonValidator,
} from "../validation";

const files = new Hono<AppContext>();

files.get("/api/files/upload-limits", getUploadLimits);
files.get("/api/files", fileListQueryValidator, listFiles);
files.get("/api/files/stats", optionalPathQueryValidator, getDirectoryStats);
files.get("/api/files/folder-tree", listFolderTree);
files.post(
  "/api/files/archive-tickets",
  createArchiveDownloadJsonValidator,
  createArchiveDownloadTicket,
);
files.get("/api/files/archive-tickets/:ticket/download", downloadArchive);
files.patch("/api/files/move", moveJsonValidator, moveEntry);
files.delete("/api/files/batch-delete", batchDeleteJsonValidator, batchDeleteEntries);
files.patch("/api/files/batch-move", batchMoveJsonValidator, batchMoveEntries);
files.post("/api/files/folders", createFolderJsonValidator, createFolder);
files.get("/api/files/folders/password/check", pathQueryValidator, checkFolderPasswordSetAllowed);
files.put("/api/files/folders/password", setFolderPasswordJsonValidator, setFolderAccessPassword);
files.post(
  "/api/files/folders/password/verify",
  verifyFolderPasswordJsonValidator,
  verifyFolderAccessPassword,
);
files.delete(
  "/api/files/folders/password",
  removeFolderPasswordJsonValidator,
  removeFolderAccessPassword,
);
files.delete("/api/files/folders", pathQueryValidator, deleteFolder);
files.patch("/api/files/folders", renameJsonValidator, renameFolder);
files.put("/api/files/object", uploadObjectQueryValidator, uploadFile);
files.patch("/api/files/object", renameJsonValidator, renameFile);
files.use("/api/files/object", async (c, next) => {
  if (c.req.method === "HEAD") {
    const validationResult = await pathQueryValidator(c, async () => {
      c.res = await headDownloadFile(c);
    });
    return validationResult ?? c.res;
  }
  await next();
});
files.get("/api/files/object", pathQueryValidator, downloadFile);
files.get("/api/files/preview", pathQueryValidator, previewFile);
files.delete("/api/files/object", pathQueryValidator, deleteFile);

export default files;
