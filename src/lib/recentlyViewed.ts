const RECENTLY_VIEWED_KEY = 'at_recently_viewed';
const MAX_RECENTLY_VIEWED = 8;

export function getRecentlyViewedIds(): number[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is number => Number.isInteger(value) && value > 0).slice(0, MAX_RECENTLY_VIEWED);
  } catch {
    return [];
  }
}

export function rememberProduct(id: number): void {
  if (!Number.isInteger(id) || id <= 0) return;
  try {
    const next = [id, ...getRecentlyViewedIds().filter(existingId => existingId !== id)].slice(0, MAX_RECENTLY_VIEWED);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  } catch {
    // Browsing continues normally when storage is blocked or full.
  }
}
