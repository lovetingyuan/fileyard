import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUploadUnloadProtection } from "../src/react-app/hooks/useUploadUnloadProtection";

const toastMock = vi.hoisted(() => ({
  dismiss: vi.fn(),
  loading: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: toastMock,
}));

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
  beforeEach(() => {
    toastMock.dismiss.mockClear();
    toastMock.loading.mockClear();
  });

  it("registers beforeunload without showing an in-page warning toast while upload is active", () => {
    const target = new FakeBeforeUnloadTarget();
    const protection = createUploadUnloadProtection({
      target,
    });

    protection.start();

    expect(target.addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(toastMock.loading).not.toHaveBeenCalled();

    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;

    target.listener?.(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.returnValue).toBe("");
  });

  it("removes the guard without touching toast state when upload finishes", () => {
    const target = new FakeBeforeUnloadTarget();
    const protection = createUploadUnloadProtection({
      target,
    });

    protection.start();
    protection.stop();

    expect(target.removeEventListener).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
    expect(toastMock.loading).not.toHaveBeenCalled();
    expect(toastMock.dismiss).not.toHaveBeenCalled();
    expect(target.listener).toBeNull();
  });
});
