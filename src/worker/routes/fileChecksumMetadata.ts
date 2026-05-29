import type { FileChecksumMetadata } from "../../types";

const checksumKeys = ["md5", "sha1", "sha256", "sha384", "sha512"] as const;

export function getFileChecksumMetadata(checksums: R2Checksums): FileChecksumMetadata | null {
  const serialized = checksums.toJSON();
  const fileChecksums: FileChecksumMetadata = {};

  for (const key of checksumKeys) {
    const value = serialized[key];
    if (typeof value === "string" && value.length > 0) {
      fileChecksums[key] = value;
    }
  }

  return Object.keys(fileChecksums).length > 0 ? fileChecksums : null;
}
