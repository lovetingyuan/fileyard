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
    vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest);
  });

  it("uploads with credentials and reports progress percent", async () => {
    const progress: number[] = [];
    const task = uploadFileWithProgress({
      file: new File(["hello"], "hello.txt", { type: "text/plain" }),
      parentPath: "docs",
      onProgress: (value) => progress.push(value),
    });

    const xhr = FakeXMLHttpRequest.instances[0];
    if (!xhr) {
      throw new Error("Expected XHR instance");
    }

    expect(xhr.method).toBe("PUT");
    expect(xhr.url).toBe("/api/files/object?name=hello.txt&parentPath=docs");
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.headers.get("Content-Type")).toBe("text/plain");

    xhr.upload.emitProgress(2, 5);
    xhr.status = 201;
    xhr.responseText = '{"success":true,"message":"ok"}';
    xhr.onload?.();

    await expect(task.promise).resolves.toEqual({ success: true, message: "ok" });
    expect(progress).toEqual([40]);
  });

  it("rejects with server error messages", async () => {
    const task = uploadFileWithProgress({
      file: new File(["hello"], "hello.txt"),
      parentPath: "",
      onProgress: vi.fn(),
    });
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

  it("rejects with a canceled error when aborted", async () => {
    const task = uploadFileWithProgress({
      file: new File(["hello"], "hello.txt"),
      parentPath: "",
      onProgress: vi.fn(),
    });

    task.cancel();

    await expect(task.promise).rejects.toMatchObject({
      isCanceled: true,
      message: "Upload canceled",
    });
  });
});
