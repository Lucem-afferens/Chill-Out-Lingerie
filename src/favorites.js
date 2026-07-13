const FAVORITES_KEY = 'virelle-favorites';

export function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0))];
  } catch {
    return [];
  }
}

export function isFavorite(id) {
  return getFavorites().includes(Number(id));
}

export function setFavorites(ids) {
  try {
    const clean = [...new Set((ids || []).map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0))];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(clean));
  } catch (err) {
    console.warn('Не удалось сохранить избранное', err);
  }
}

export function toggleFavoriteId(id) {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return false;
  const current = getFavorites();
  const next = current.includes(n) ? current.filter((x) => x !== n) : [...current, n];
  setFavorites(next);
  return next.includes(n);
}
