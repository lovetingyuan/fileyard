import type { FileChecksumMetadata } from "../../../../types";

const checksumDetailOrder = [
  ["sha512", "SHA-512"],
  ["sha384", "SHA-384"],
  ["sha256", "SHA-256"],
  ["sha1", "SHA-1"],
  ["md5", "MD5"],
] as const;

export function formatContentTypeDetailValue(contentType: string | null): string {
  return contentType?.trim() ? contentType : "未知";
}

export function formatFileChecksumDetailValue(
  checksums: FileChecksumMetadata | null,
): string | string[] {
  const lines = checksumDetailOrder.flatMap(([key, label]) => {
    const value = checksums?.[key];
    return value ? [`${label}: ${value}`] : [];
  });

  return lines.length > 0 ? lines : "暂无";
}
