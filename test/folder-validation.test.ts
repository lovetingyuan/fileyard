import { describe, expect, it } from "vitest";
import { validateFolderName } from "../src/react-app/utils/folderValidation";

describe("folder name validation", () => {
  it("rejects current and legacy reserved marker names", () => {
    expect(validateFolderName(".fileyard-folder")).toBe("This is a reserved name");
    expect(validateFolderName(".fileshare-folder")).toBe("This is a reserved name");
  });
});
