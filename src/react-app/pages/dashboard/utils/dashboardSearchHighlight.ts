export const DASHBOARD_SEARCH_HIGHLIGHT_NAME = "fileyard-dashboard-search-result";

type HighlightRegistryWithMutations = HighlightRegistry & {
  set: (name: string, highlight: Highlight) => void;
  delete: (name: string) => boolean;
};

type HighlightSupport = {
  registry: HighlightRegistryWithMutations;
  HighlightConstructor: new (...initialRanges: AbstractRange[]) => Highlight;
};

const highlightRangesByKey = new Map<string, AbstractRange[]>();

function getHighlightSupport(): HighlightSupport | null {
  if (typeof CSS === "undefined" || typeof Highlight === "undefined") {
    return null;
  }

  const registry = CSS.highlights as HighlightRegistryWithMutations | undefined;
  if (!registry || typeof registry.set !== "function" || typeof registry.delete !== "function") {
    return null;
  }

  return {
    registry,
    HighlightConstructor: Highlight,
  };
}

function rebuildDashboardSearchHighlight() {
  const support = getHighlightSupport();
  if (!support) {
    return;
  }

  const ranges = Array.from(highlightRangesByKey.values()).flat();
  if (ranges.length === 0) {
    support.registry.delete(DASHBOARD_SEARCH_HIGHLIGHT_NAME);
    return;
  }

  support.registry.set(
    DASHBOARD_SEARCH_HIGHLIGHT_NAME,
    new support.HighlightConstructor(...ranges),
  );
}

export function setDashboardSearchHighlightRanges(key: string, ranges: AbstractRange[]) {
  if (ranges.length === 0) {
    highlightRangesByKey.delete(key);
  } else {
    highlightRangesByKey.set(key, ranges);
  }
  rebuildDashboardSearchHighlight();
}

export function clearDashboardSearchHighlightRanges(key: string) {
  if (highlightRangesByKey.delete(key)) {
    rebuildDashboardSearchHighlight();
  }
}
