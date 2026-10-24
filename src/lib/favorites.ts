// お気に入りの街を localStorage に保存する小さなストア。
// useSyncExternalStore から読むので、サーバー描画（空）とブラウザ描画（保存あり）の食い違いが起きない

const STORAGE_KEY = "weather-favorites";
const MAX = 8;
const EMPTY: string[] = [];

let cache: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  if (cache === null) cache = read();
  return cache;
}

export function getServerSnapshot() {
  return EMPTY;
}

/** 入っていれば外し、なければ先頭に足す。足したら true */
export function toggleFavorite(city: string): boolean {
  const current = getSnapshot();
  const added = !current.includes(city);
  cache = added ? [city, ...current].slice(0, MAX) : current.filter((c) => c !== city);
  listeners.forEach((l) => l());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {}
  return added;
}
