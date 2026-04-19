import { describe, expect, it } from "vitest";
import { validateFolderName } from "../src/react-app/utils/folderValidation";

describe("folder name validation", () => {
  it("rejects current and legacy reserved marker names", () => {
    expect(validateFolderName(".fileyard-folder")).toBe("This is a reserved name");
    expect(validateFolderName(".fileshare-folder")).toBe("This is a reserved name");
  });

  it("allows ordinary dot-prefixed folder names", () => {
    expect(validateFolderName(".hidden")).toBeNull();
  });

  it("rejects the reserved system profile folder name", () => {
    expect(validateFolderName(".user")).toBe("This is a reserved name");
  });
});
