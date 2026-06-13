export type ImageOriginalDimensions = {
  height: number
  width: number
}

export function formatImageOriginalDimensions({ height, width }: ImageOriginalDimensions): string {
  return `尺寸：${width} x ${height}`
}
