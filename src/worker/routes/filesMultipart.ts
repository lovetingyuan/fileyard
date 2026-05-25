import { Hono } from "hono";
import type { AppContext } from "../context";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  uploadMultipartPart,
} from "./filesMultipartHandlers";

const multipartFiles = new Hono<AppContext>();

multipartFiles.post("/api/files/multipart", createMultipartUpload);
multipartFiles.put("/api/files/multipart/part", uploadMultipartPart);
multipartFiles.post("/api/files/multipart/complete", completeMultipartUpload);
multipartFiles.delete("/api/files/multipart", abortMultipartUpload);

export default multipartFiles;
