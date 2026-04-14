const LOCAL_NO_PROXY_ENTRIES = ["localhost", "127.0.0.1", "::1"] as const;

function splitNoProxyEntries(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ensureLocalNoProxy(env: NodeJS.ProcessEnv): string {
  const mergedEntries: string[] = [];
  const seenEntries = new Set<string>();

  for (const entry of [
    ...splitNoProxyEntries(env.NO_PROXY),
    ...splitNoProxyEntries(env.no_proxy),
    ...LOCAL_NO_PROXY_ENTRIES,
  ]) {
    const normalizedEntry = entry.toLowerCase();
    if (seenEntries.has(normalizedEntry)) {
      continue;
    }

    seenEntries.add(normalizedEntry);
    mergedEntries.push(entry);
  }

  const noProxyValue = mergedEntries.join(",");
  env.NO_PROXY = noProxyValue;
  env.no_proxy = noProxyValue;
  return noProxyValue;
}
