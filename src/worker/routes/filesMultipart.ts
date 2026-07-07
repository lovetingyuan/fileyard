import { Hono } from "hono";
import type { AppContext } from "../context";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  uploadMultipartPart,
} from "./filesMultipartHandlers";
import {
  multipartCompleteJsonValidator,
  multipartCreateJsonValidator,
  multipartPartQueryValidator,
  uploadIdQueryValidator,
} from "../validation";

const multipartFiles = new Hono<AppContext>();

multipartFiles.post("/api/files/multipart", multipartCreateJsonValidator, createMultipartUpload);
multipartFiles.put("/api/files/multipart/part", multipartPartQueryValidator, uploadMultipartPart);
multipartFiles.post(
  "/api/files/multipart/completions",
  multipartCompleteJsonValidator,
  completeMultipartUpload,
);
multipartFiles.delete("/api/files/multipart", uploadIdQueryValidator, abortMultipartUpload);

export default multipartFiles;
