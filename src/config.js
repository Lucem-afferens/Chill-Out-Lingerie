/**
 * Site-wide config for Virelle.
 */
export function formatPrice(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('ru-RU')} ₽`;
}

/** Basic RU phone check: +7 / 8 and 10 digits */
export function isValidRuPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) return true;
  if (digits.length === 10) return true;
  return false;
}

export function isValidEmail(value) {
  const v = String(value || '').trim();
  if (!v) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}
