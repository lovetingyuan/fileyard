export type SearchMatchRange = {
  start: number;
  end: number;
};

export function findFuzzyMatchRanges(name: string, query: string): SearchMatchRange[] | null {
  if (!query) {
    return [];
  }

  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchedIndexes: number[] = [];
  let queryIndex = 0;

  for (let index = 0; index < lowerName.length && queryIndex < lowerQuery.length; index++) {
    if (lowerName[index] === lowerQuery[queryIndex]) {
      matchedIndexes.push(index);
      queryIndex++;
    }
  }

  if (queryIndex !== lowerQuery.length) {
    return null;
  }

  const ranges: SearchMatchRange[] = [];
  for (const index of matchedIndexes) {
    const lastRange = ranges[ranges.length - 1];
    if (lastRange && lastRange.end === index) {
      lastRange.end = index + 1;
    } else {
      ranges.push({ start: index, end: index + 1 });
    }
  }

  return ranges;
}
