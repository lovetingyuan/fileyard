import { describe, expect, it } from "vitest";
import {
  FOLDER_MARKER_NAME,
  getFolderMarkerKey,
  isFolderMarkerName,
} from "../src/worker/utils/fileManager";

describe("file manager folder markers", () => {
  it("uses the fileyard marker name for new folders", () => {
    expect(FOLDER_MARKER_NAME).toBe(".fileyard-folder");
    expect(getFolderMarkerKey("root-dir", "docs")).toBe("root-dir/docs/.fileyard-folder");
  });

  it("recognizes both current and legacy folder marker names", () => {
    expect(isFolderMarkerName(".fileyard-folder")).toBe(true);
    expect(isFolderMarkerName(".fileshare-folder")).toBe(true);
    expect(isFolderMarkerName("docs")).toBe(false);
  });
});
