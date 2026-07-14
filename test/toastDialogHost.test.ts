import { describe, expect, it } from "vitest";
import { getToastDialogHost, registerToastDialogHost } from "../src/react-app/components/toastDialogHost";

describe("toast dialog host", () => {
  it("uses the topmost dialog and falls back when it closes", () => {
    const parentDialog = {} as HTMLDialogElement;
    const childDialog = {} as HTMLDialogElement;
    const unregisterParent = registerToastDialogHost(parentDialog);
    const unregisterChild = registerToastDialogHost(childDialog);

    expect(getToastDialogHost()).toBe(childDialog);

    unregisterChild();
    expect(getToastDialogHost()).toBe(parentDialog);

    unregisterParent();
    expect(getToastDialogHost()).toBeNull();
  });
});
