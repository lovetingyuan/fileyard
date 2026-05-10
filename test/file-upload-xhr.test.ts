import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadFileWithProgress } from "../src/react-app/utils/fileUpload";

type Listener = (event: ProgressEvent) => void;

class FakeUploadTarget {
  private readonly listeners = new Map<string, Listener>();

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, listener);
  }

  emitProgress(loaded: number, total: number) {
    this.listeners.get("progress")?.({ lengthComputable: true, loaded, total } as ProgressEvent);
  }
}

class FakeXMLHttpRequest {
  static instances: FakeXMLHttpRequest[] = [];

  readonly upload = new FakeUploadTarget();
  withCredentials = false;
  status = 0;
  responseText = "";
  statusText = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  method = "";
  url = "";
  body: Document | XMLHttpRequestBodyInit | null = null;
  headers = new Map<string, string>();

  constructor() {
    FakeXMLHttpRequest.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  send(body: Document | XMLHttpRequestBodyInit | null) {
    this.body = body;
  }

  abort() {
    this.onabort?.();
  }
}

describe("uploadFileWithProgress", () => {
  beforeEach(() => {
    FakeXMLHttpRequest.instances = [];
    vi.unstubAllGlobals();
    vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest);
  });

  it("uploads multipart parts with credentials and reports aggregate progress", async () => {
    const progress: number[] = [];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          success: true,
          uploadId: "upload-1",
          partSize: 5,
          partCount: 3,
        }),
      )
      .mockResolvedValueOnce(Response.json({ success: true, message: "ok" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const task = uploadFileWithProgress({
      file: new File(["hello world!"], "hello.txt", { type: "text/plain" }),
      parentPath: "docs",
      onProgress: (value) => progress.push(value),
    });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/files/multipart",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      parentPath: "docs",
      name: "hello.txt",
      size: 12,
      contentType: "text/plain",
    });

    await vi.waitFor(() => expect(FakeXMLHttpRequest.instances).toHaveLength(1));
    const xhr = FakeXMLHttpRequest.instances[0];
    if (!xhr) {
      throw new Error("Expected XHR instance");
    }

    expect(xhr.method).toBe("PUT");
    expect(xhr.url).toBe("/api/files/multipart/part?uploadId=upload-1&partNumber=1");
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.headers.get("Content-Type")).toBe("application/octet-stream");

    xhr.upload.emitProgress(2, 5);
    xhr.status = 200;
    xhr.responseText = '{"success":true,"part":{"partNumber":1,"etag":"etag-1"},"uploadedBytes":5}';
    xhr.onload?.();

    await vi.waitFor(() => expect(FakeXMLHttpRequest.instances).toHaveLength(2));
    const secondXhr = FakeXMLHttpRequest.instances[1];
    secondXhr.upload.emitProgress(5, 5);
    secondXhr.status = 200;
    secondXhr.responseText =
      '{"success":true,"part":{"partNumber":2,"etag":"etag-2"},"uploadedBytes":5}';
    secondXhr.onload?.();

    await vi.waitFor(() => expect(FakeXMLHttpRequest.instances).toHaveLength(3));
    const thirdXhr = FakeXMLHttpRequest.instances[2];
    thirdXhr.upload.emitProgress(2, 2);
    thirdXhr.status = 200;
    thirdXhr.responseText =
      '{"success":true,"part":{"partNumber":3,"etag":"etag-3"},"uploadedBytes":2}';
    thirdXhr.onload?.();

    await expect(task.promise).resolves.toEqual({ success: true, message: "ok" });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/files/multipart/complete",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          uploadId: "upload-1",
          parts: [
            { partNumber: 1, etag: "etag-1" },
            { partNumber: 2, etag: "etag-2" },
            { partNumber: 3, etag: "etag-3" },
          ],
        }),
      }),
    );
    expect(progress).toEqual([17, 83, 100]);
  });

  it("rejects with server error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          success: true,
          uploadId: "upload-1",
          partSize: 5,
          partCount: 1,
        }),
      ),
    );

    const task = uploadFileWithProgress({
      file: new File(["hello"], "hello.txt"),
      parentPath: "",
      onProgress: vi.fn(),
    });
    await vi.waitFor(() => expect(FakeXMLHttpRequest.instances).toHaveLength(1));
    const xhr = FakeXMLHttpRequest.instances[0];
    if (!xhr) {
      throw new Error("Expected XHR instance");
    }

    xhr.status = 409;
    xhr.responseText = '{"success":false,"error":"A file with this name already exists"}';
    xhr.onload?.();

    await expect(task.promise).rejects.toMatchObject({
      status: 409,
      message: "A file with this name already exists",
    });
  });

  it("aborts the multipart upload when canceled", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          success: true,
          uploadId: "upload-1",
          partSize: 5,
          partCount: 1,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const task = uploadFileWithProgress({
      file: new File(["hello"], "hello.txt"),
      parentPath: "",
      onProgress: vi.fn(),
    });

    await vi.waitFor(() => expect(FakeXMLHttpRequest.instances).toHaveLength(1));
    task.cancel();

    await expect(task.promise).rejects.toMatchObject({
      isCanceled: true,
      message: "Upload canceled",
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/files/multipart?uploadId=upload-1",
      expect.objectContaining({
        method: "DELETE",
        credentials: "include",
      }),
    );
  });
});
