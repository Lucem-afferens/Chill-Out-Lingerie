/**
 * Cart store (localStorage) — line items with size + qty.
 * Shape: { productId: number, size: string, qty: number }[]
 */

const CART_KEY = 'virelle-cart';
export const CART_MAX_QTY = 10;
export const CART_MAX_LINES = 30;

function normalizeLine(raw) {
  const productId = Number(raw?.productId);
  const size = String(raw?.size || '').trim();
  const qty = Math.min(CART_MAX_QTY, Math.max(1, Number(raw?.qty) || 1));
  if (!Number.isFinite(productId) || productId <= 0 || !size) return null;
  return { productId, size, qty };
}

export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeLine).filter(Boolean).slice(0, CART_MAX_LINES);
  } catch {
    return [];
  }
}

export function setCart(lines) {
  const cleaned = (Array.isArray(lines) ? lines : [])
    .map(normalizeLine)
    .filter(Boolean)
    .slice(0, CART_MAX_LINES);
  localStorage.setItem(CART_KEY, JSON.stringify(cleaned));
  return cleaned;
}

export function getCartCount(lines = getCart()) {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

export function findCartLine(productId, size, lines = getCart()) {
  const id = Number(productId);
  const s = String(size || '').trim();
  return lines.find((line) => line.productId === id && line.size === s) || null;
}

/**
 * @returns {{ ok: boolean, cart: Array, error?: string, merged?: boolean }}
 */
export function addToCart(productId, size, qty = 1) {
  const id = Number(productId);
  const s = String(size || '').trim();
  const q = Math.min(CART_MAX_QTY, Math.max(1, Number(qty) || 1));

  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, cart: getCart(), error: 'Товар не найден.' };
  }
  if (!s) {
    return { ok: false, cart: getCart(), error: 'Выберите размер.' };
  }

  const cart = getCart();
  const existing = findCartLine(id, s, cart);

  if (existing) {
    const nextQty = Math.min(CART_MAX_QTY, existing.qty + q);
    if (nextQty === existing.qty && existing.qty >= CART_MAX_QTY) {
      return {
        ok: false,
        cart,
        error: `Максимум ${CART_MAX_QTY} шт. для одной позиции.`,
        merged: true
      };
    }
    existing.qty = nextQty;
    return { ok: true, cart: setCart(cart), merged: true };
  }

  if (cart.length >= CART_MAX_LINES) {
    return {
      ok: false,
      cart,
      error: 'В корзине слишком много позиций. Оформите заказ или удалите лишнее.'
    };
  }

  cart.push({ productId: id, size: s, qty: q });
  return { ok: true, cart: setCart(cart), merged: false };
}

export function updateCartQty(productId, size, qty) {
  const cart = getCart();
  const line = findCartLine(productId, size, cart);
  if (!line) return { ok: false, cart, error: 'Позиция не найдена.' };

  const next = Math.floor(Number(qty));
  if (!Number.isFinite(next) || next < 1) {
    return removeFromCart(productId, size);
  }

  line.qty = Math.min(CART_MAX_QTY, next);
  return { ok: true, cart: setCart(cart) };
}

export function removeFromCart(productId, size) {
  const id = Number(productId);
  const s = String(size || '').trim();
  const next = getCart().filter((line) => !(line.productId === id && line.size === s));
  return { ok: true, cart: setCart(next) };
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
  return [];
}

export function getCartSubtotal(lines, getProductById) {
  return lines.reduce((sum, line) => {
    const product = getProductById(line.productId);
    if (!product) return sum;
    return sum + Number(product.price || 0) * line.qty;
  }, 0);
}
