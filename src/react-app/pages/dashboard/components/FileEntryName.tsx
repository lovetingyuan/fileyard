import { useCallback } from "react";
import {
  clearDashboardSearchHighlightRanges,
  setDashboardSearchHighlightRanges,
} from "../utils/dashboardSearchHighlight";
import type { SearchMatchRange } from "../utils/searchMatch";

const EMPTY_SEARCH_MATCH_RANGES: SearchMatchRange[] = [];

export function FileEntryName({
  entryKey,
  name,
  ranges = EMPTY_SEARCH_MATCH_RANGES,
}: {
  entryKey: string;
  name: string;
  ranges?: SearchMatchRange[];
}) {
  const registerTextNode = useCallback(
    (node: HTMLSpanElement | null) => {
      clearDashboardSearchHighlightRanges(entryKey);

      const textNode = node?.firstChild;
      const textLength = textNode?.textContent?.length ?? 0;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE || ranges.length === 0) {
        return;
      }

      const highlightRanges = ranges
        .filter((range) => range.start >= 0 && range.start < range.end && range.end <= textLength)
        .map((matchRange) => {
          const range = new Range();
          range.setStart(textNode, matchRange.start);
          range.setEnd(textNode, matchRange.end);
          return range;
        });

      setDashboardSearchHighlightRanges(entryKey, highlightRanges);
    },
    [entryKey, ranges],
  );

  return <span ref={registerTextNode}>{name}</span>;
}
