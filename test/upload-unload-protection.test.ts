import { describe, expect, it, vi } from "vitest";
import {
  createUploadUnloadProtection,
  UPLOAD_UNLOAD_TOAST_ID,
  UPLOAD_UNLOAD_TOAST_MESSAGE,
} from "../src/react-app/hooks/useUploadUnloadProtection";

class FakeBeforeUnloadTarget {
  listener: ((event: BeforeUnloadEvent) => void) | null = null;

  addEventListener = vi.fn(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === "beforeunload" && typeof listener === "function") {
        this.listener = listener as (event: BeforeUnloadEvent) => void;
      }
    },
  );

  removeEventListener = vi.fn(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === "beforeunload" && this.listener === listener) {
        this.listener = null;
      }
    },
  );
}

describe("upload unload protection", () => {
  it("registers beforeunload and shows a warning toast while upload is active", () => {
    const target = new FakeBeforeUnloadTarget();
    const loading = vi.fn();
    const dismiss = vi.fn();
    const protection = createUploadUnloadProtection({
      target,
      toaster: { loading, dismiss },
    });

    protection.start();

    expect(target.addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(loading).toHaveBeenCalledWith(UPLOAD_UNLOAD_TOAST_MESSAGE, {
      id: UPLOAD_UNLOAD_TOAST_ID,
    });

    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;

    target.listener?.(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.returnValue).toBe("");
  });

  it("removes the guard and dismisses the toast when upload finishes", () => {
    const target = new FakeBeforeUnloadTarget();
    const loading = vi.fn();
    const dismiss = vi.fn();
    const protection = createUploadUnloadProtection({
      target,
      toaster: { loading, dismiss },
    });

    protection.start();
    protection.stop();

    expect(target.removeEventListener).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
    expect(dismiss).toHaveBeenCalledWith(UPLOAD_UNLOAD_TOAST_ID);
    expect(target.listener).toBeNull();
  });
});
