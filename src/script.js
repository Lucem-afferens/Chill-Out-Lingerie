import './styles/style.scss';
import { catalogProducts, getProductById, getFeaturedProducts } from './data/products.js';
import { formatPrice, isValidRuPhone, isValidEmail } from './config.js';
import { getFavorites, isFavorite, toggleFavoriteId } from './favorites.js';
import {
    getCart,
    setCart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    getCartCount,
    getCartSubtotal,
    CART_MAX_QTY
} from './cart.js';
import { injectSharedModals } from './shared-modals.js';

injectSharedModals();

let catalogSearchQuery = '';
let selectedProductSize = '';
let selectedQuickViewSize = '';
let quickViewProductId = null;

/* ---- Body scroll lock (prevents layout jump when scrollbar disappears) ---- */
let bodyScrollLockCount = 0;
let programmaticScrollUntil = 0;

function getScrollbarWidth() {
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function lockBodyScroll() {
    bodyScrollLockCount += 1;
    if (bodyScrollLockCount > 1) return;

    const offset = getScrollbarWidth();
    document.documentElement.classList.add('is-scroll-locked');
    document.body.style.overflow = 'hidden';
    if (offset > 0) {
        document.documentElement.style.setProperty('--scroll-lock-offset', `${offset}px`);
        document.body.style.paddingRight = `${offset}px`;
    }
}

function unlockBodyScroll() {
    bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
    if (bodyScrollLockCount > 0) return;

    document.documentElement.classList.remove('is-scroll-locked');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.documentElement.style.removeProperty('--scroll-lock-offset');
}

function beginProgrammaticScroll(durationMs = 900) {
    programmaticScrollUntil = Date.now() + durationMs;
    const header = document.getElementById('header');
    if (header) header.classList.remove('header-hidden');
}

function isProgrammaticScrollActive() {
    return Date.now() < programmaticScrollUntil;
}

function setFavoriteButtonState(el, active) {
    if (!el) return;
    el.classList.toggle('is-active', active);
    el.setAttribute('aria-pressed', String(active));

    // Prefer a single <i> glyph (FA CSS). Wipe leftover nested SVGs from old FA JS mode.
    el.querySelectorAll('svg').forEach((svg) => svg.remove());

    let icon = el.querySelector('i.fa-heart, i[class*="fa-heart"], i');
    if (!icon) {
        icon = document.createElement('i');
        icon.setAttribute('aria-hidden', 'true');
        el.insertBefore(icon, el.firstChild);
    }
    icon.className = active ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    icon.setAttribute('aria-hidden', 'true');
}

function toggleFavorite(id, btn, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const active = toggleFavoriteId(id);
    if (btn) setFavoriteButtonState(btn, active);
    updateFavoritesBadge();
    document.querySelectorAll(`[data-favorite-id="${id}"]`).forEach((el) => {
        if (el === btn) return;
        setFavoriteButtonState(el, active);
    });
}

function updateFavoritesBadge() {
    const count = getFavorites().length;
    document.querySelectorAll('[data-favorites-count]').forEach((el) => {
        el.textContent = String(count);
        el.hidden = count === 0;
    });
}

function updateCartBadge() {
    const count = getCartCount();
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
        el.textContent = String(count);
        el.hidden = count === 0;
    });
}

function renderSelectableSizes(container, sizes, selected, onSelect) {
    if (!container) return;
    const list = Array.isArray(sizes) ? sizes : [];
    container.innerHTML = list
        .map(
            (s) =>
                `<button type="button" class="product-size-chip${selected === s ? ' is-selected' : ''}" data-size="${s}" aria-pressed="${selected === s}">${s}</button>`
        )
        .join('');
    container.querySelectorAll('[data-size]').forEach((btn) => {
        btn.addEventListener('click', () => onSelect(btn.getAttribute('data-size')));
    });
}

function handleAddToCart(productId, size) {
    const product = getProductById(productId);
    if (!product) {
        showNotification('Ошибка', 'Товар не найден.', 'error', 3000);
        return false;
    }
    const result = addToCart(productId, size, 1);
    updateCartBadge();
    if (!result.ok) {
        showNotification('Не удалось добавить', result.error || 'Попробуйте ещё раз.', 'error', 3500);
        return false;
    }
    showNotification(
        'В корзине',
        result.merged
            ? `${product.name} (${size}) — количество обновлено.`
            : `${product.name} (${size}) добавлен в корзину.`,
        'success',
        2800
    );
    if (document.getElementById('cart-page')) {
        renderCartPage();
    }
    return true;
}

function clearFormErrors(form) {
    form.querySelectorAll('.form-field').forEach((field) => field.classList.remove('is-invalid'));
    form.querySelectorAll('.form-error').forEach((el) => {
        el.textContent = '';
    });
}

function setFieldError(form, name, message) {
    const field = form.querySelector(`[data-field="${name}"]`);
    const error = form.querySelector(`[data-error-for="${name}"]`);
    if (field) field.classList.add('is-invalid');
    if (error) error.textContent = message || '';
}

function validateCheckoutForm(form) {
    clearFormErrors(form);
    const data = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        city: form.city.value.trim(),
        address: form.address.value.trim(),
        comment: form.comment.value.trim(),
        agree: form.agree.checked,
        company: form.company?.value?.trim() || ''
    };

    const errors = {};
    if (data.company) {
        errors.honeypot = true;
    }
    if (data.name.length < 2) errors.name = 'Укажите имя.';
    if (!isValidRuPhone(data.phone)) errors.phone = 'Укажите корректный телефон.';
    if (!isValidEmail(data.email)) errors.email = 'Проверьте email.';
    if (data.city.length < 2) errors.city = 'Укажите город.';
    if (data.address.length < 5) errors.address = 'Укажите адрес доставки.';
    if (data.comment.length > 500) errors.comment = 'Слишком длинный комментарий.';
    if (!data.agree) errors.agree = 'Нужно согласие на обработку данных.';

    Object.entries(errors).forEach(([key, message]) => {
        if (key === 'honeypot') return;
        setFieldError(form, key, message);
    });

    return { ok: Object.keys(errors).length === 0, data, errors };
}

function renderCartPage() {
    const root = document.getElementById('cart-page');
    if (!root) return;

    const empty = document.getElementById('cart-empty');
    const wrap = document.getElementById('cart-lines-wrap');
    const list = document.getElementById('cart-lines');
    const form = document.getElementById('checkout-form');
    const success = document.getElementById('checkout-success');
    const emptyHint = document.getElementById('checkout-empty-hint');
    const countEl = document.getElementById('cart-items-count');
    const subtotalEl = document.getElementById('cart-subtotal');

    const cart = getCart();
    const validLines = cart.filter((line) => getProductById(line.productId));
    if (validLines.length !== cart.length) {
        setCart(validLines);
    }
    const lines = getCart();
    const isEmpty = lines.length === 0;
    const orderDone = success && !success.hidden;

    if (empty) empty.hidden = !isEmpty || orderDone;
    if (wrap) wrap.hidden = isEmpty || orderDone;
    if (form) form.hidden = isEmpty || orderDone;
    if (emptyHint) emptyHint.hidden = !isEmpty || orderDone;

    if (list && !isEmpty && !orderDone) {
        list.innerHTML = lines
            .map((line) => {
                const product = getProductById(line.productId);
                if (!product) return '';
                const lineTotal = product.price * line.qty;
                return `
                <li class="cart-line" data-product-id="${line.productId}" data-size="${line.size}">
                    <img class="cart-line-image" src="${product.image}" alt="" width="72" height="88" loading="lazy">
                    <div class="cart-line-body">
                        <div class="cart-line-top">
                            <h3 class="cart-line-name"><a href="product.html?id=${product.id}">${product.name}</a></h3>
                            <p class="cart-line-price">${formatPrice(lineTotal)}</p>
                        </div>
                        <p class="cart-line-meta">Размер: ${line.size} · ${formatPrice(product.price)} / шт.</p>
                        <div class="cart-line-actions">
                            <div class="cart-qty" role="group" aria-label="Количество">
                                <button type="button" data-cart-qty="-1" aria-label="Уменьшить" ${line.qty <= 1 ? 'disabled' : ''}>−</button>
                                <span class="cart-qty-value">${line.qty}</span>
                                <button type="button" data-cart-qty="1" aria-label="Увеличить" ${line.qty >= CART_MAX_QTY ? 'disabled' : ''}>+</button>
                            </div>
                            <button type="button" class="cart-line-remove" data-cart-remove>Удалить</button>
                        </div>
                    </div>
                </li>`;
            })
            .join('');
    }

    if (countEl) countEl.textContent = `${getCartCount(lines)} шт.`;
    if (subtotalEl) subtotalEl.textContent = formatPrice(getCartSubtotal(lines, getProductById));
    updateCartBadge();
}

function initCartPage() {
    const root = document.getElementById('cart-page');
    if (!root) return;

    renderCartPage();

    const list = document.getElementById('cart-lines');
    if (list && !list.dataset.bound) {
        list.dataset.bound = '1';
        list.addEventListener('click', (e) => {
            const line = e.target.closest('.cart-line');
            if (!line) return;
            const productId = line.getAttribute('data-product-id');
            const size = line.getAttribute('data-size');

            if (e.target.closest('[data-cart-remove]')) {
                removeFromCart(productId, size);
                showNotification('Удалено', 'Позиция убрана из корзины.', 'success', 2200);
                renderCartPage();
                return;
            }

            const qtyBtn = e.target.closest('[data-cart-qty]');
            if (qtyBtn) {
                const delta = Number(qtyBtn.getAttribute('data-cart-qty'));
                const current = getCart().find(
                    (l) => String(l.productId) === String(productId) && l.size === size
                );
                if (!current) return;
                const next = current.qty + delta;
                if (next < 1) {
                    removeFromCart(productId, size);
                } else {
                    const result = updateCartQty(productId, size, next);
                    if (!result.ok && result.error) {
                        showNotification('Лимит', result.error, 'error', 2500);
                    }
                }
                renderCartPage();
            }
        });
    }

    const form = document.getElementById('checkout-form');
    if (form && !form.dataset.bound) {
        form.dataset.bound = '1';
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitBtn = document.getElementById('checkout-submit');

            if (getCart().length === 0) {
                showNotification('Корзина пуста', 'Добавьте товары перед оформлением.', 'error', 3000);
                renderCartPage();
                return;
            }

            const { ok, data, errors } = validateCheckoutForm(form);
            if (errors.honeypot) {
                // Silent success for bots
                form.reset();
                return;
            }
            if (!ok) {
                showNotification('Проверьте форму', 'Заполните обязательные поля.', 'error', 3000);
                const firstInvalid = form.querySelector('.form-field.is-invalid input, .form-field.is-invalid textarea, .form-field.is-invalid input[type="checkbox"]');
                firstInvalid?.focus();
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.setAttribute('aria-busy', 'true');
            }

            // Stub network delay
            await new Promise((r) => setTimeout(r, 650));

            const orderId = `VR-${Date.now().toString(36).toUpperCase()}`;
            const snapshot = {
                orderId,
                createdAt: new Date().toISOString(),
                customer: {
                    name: data.name,
                    phone: data.phone,
                    email: data.email || null,
                    city: data.city,
                    address: data.address,
                    comment: data.comment || null
                },
                items: getCart(),
                total: getCartSubtotal(getCart(), getProductById)
            };

            try {
                sessionStorage.setItem('virelle-last-order', JSON.stringify(snapshot));
            } catch {
                /* ignore quota */
            }

            clearCart();
            updateCartBadge();
            form.reset();
            clearFormErrors(form);

            const success = document.getElementById('checkout-success');
            const successText = document.getElementById('checkout-success-text');
            if (successText) {
                successText.textContent = `Номер заявки ${orderId}. Мы свяжемся по телефону ${data.phone} для подтверждения.`;
            }
            if (success) success.hidden = false;
            form.hidden = true;
            const emptyHintEl = document.getElementById('checkout-empty-hint');
            if (emptyHintEl) emptyHintEl.hidden = true;

            const empty = document.getElementById('cart-empty');
            const wrap = document.getElementById('cart-lines-wrap');
            if (empty) empty.hidden = true;
            if (wrap) wrap.hidden = true;

            showNotification(
                'Заказ отправлен',
                `Заявка ${orderId} принята. Это демо-отправка без сервера.`,
                'success',
                4500
            );

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.removeAttribute('aria-busy');
            }

            success?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
}

function handleCatalogSearch(event) {
    catalogSearchQuery = (event?.target?.value || '').trim().toLowerCase();
    applyFiltersToProducts();
}

function initCatalogSearch() {
    const input = document.getElementById('catalog-search');
    if (!input) return;
    input.addEventListener('input', handleCatalogSearch);
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
        input.value = q;
        catalogSearchQuery = q.trim().toLowerCase();
    }
}

function initProductPage() {
    const root = document.getElementById('product-page');
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = getProductById(id);

    const empty = document.getElementById('product-empty');
    const content = document.getElementById('product-content');

    if (!product) {
        if (empty) empty.hidden = false;
        if (content) content.hidden = true;
        return;
    }

    if (empty) empty.hidden = true;
    if (content) content.hidden = false;

    document.title = `${product.name} | Virelle`;

    const img = document.getElementById('product-image');
    if (img) {
        img.src = product.image;
        img.alt = product.name;
    }
    const name = document.getElementById('product-title');
    if (name) name.textContent = product.name;
    const desc = document.getElementById('product-description');
    if (desc) desc.textContent = product.description;
    const price = document.getElementById('product-price');
    if (price) price.textContent = formatPrice(product.price);
    const original = document.getElementById('product-original-price');
    if (original) {
        if (product.originalPrice) {
            original.textContent = formatPrice(product.originalPrice);
            original.hidden = false;
        } else {
            original.hidden = true;
        }
    }
    const materials = document.getElementById('product-materials');
    if (materials) {
        materials.textContent = product.materials || product.description;
    }
    const care = document.getElementById('product-care');
    if (care) {
        care.textContent = product.care || 'Деликатная стирка, сушить в расправленном виде.';
    }
    const sizes = document.getElementById('product-sizes');
    selectedProductSize = '';
    const bindProductSizes = (selected) => {
        selectedProductSize = selected || '';
        renderSelectableSizes(sizes, product.sizes || [], selectedProductSize, (size) => bindProductSizes(size));
        const addBtn = document.getElementById('product-order-btn');
        if (addBtn) addBtn.disabled = !selectedProductSize;
    };
    bindProductSizes('');

    const order = document.getElementById('product-order-btn');
    if (order) {
        order.disabled = true;
        order.onclick = (e) => {
            e.preventDefault();
            if (!selectedProductSize) {
                showNotification('Выберите размер', 'Укажите размер перед добавлением в корзину.', 'error', 3000);
                return;
            }
            handleAddToCart(product.id, selectedProductSize);
        };
    }

    const favBtn = document.getElementById('product-favorite-btn');
    if (favBtn) {
        const active = isFavorite(product.id);
        favBtn.dataset.favoriteId = String(product.id);
        favBtn.onclick = (event) => toggleFavorite(product.id, favBtn, event);
        setFavoriteButtonState(favBtn, active);
    }

    const related = document.getElementById('product-related-grid');
    if (related) {
        const items = catalogProducts
            .filter((p) => p.id !== product.id)
            .filter((p) => p.type.some((t) => product.type.includes(t)) || p.category.some((c) => product.category.includes(c)))
            .slice(0, 4);
        related.innerHTML = (items.length ? items : getFeaturedProducts(4)).map((p) => createProductCard(p)).join('');
        initProductCarousels();
        initTouchProductOverlays();
    }
}


function ensureMenuScrim() {
    let scrim = document.getElementById('menu-scrim');
    if (!scrim) {
        scrim = document.createElement('div');
        scrim.id = 'menu-scrim';
        scrim.className = 'menu-scrim';
        scrim.setAttribute('aria-hidden', 'true');
        scrim.addEventListener('click', () => closeMenu());
        document.body.appendChild(scrim);
    }
    return scrim;
}

function openMenu() {
    const menuOverlay = document.getElementById('menu-overlay');
    const menuBtn = document.querySelector('.menu-btn');
    if (!menuOverlay) return;

    const scrim = ensureMenuScrim();
    scrim.classList.add('is-active');

    menuOverlay.classList.add('active');
    if (menuBtn) {
        menuBtn.setAttribute('aria-expanded', 'true');
    }
    lockBodyScroll();

    const closeBtn = menuOverlay.querySelector('.menu-close');
    if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 80);
    }
}

function closeMenu() {
    const menuOverlay = document.getElementById('menu-overlay');
    const menuBtn = document.querySelector('.menu-btn');
    const scrim = document.getElementById('menu-scrim');

    if (menuOverlay?.classList.contains('active')) {
        menuOverlay.classList.remove('active');
        unlockBodyScroll();
    }
    if (scrim) scrim.classList.remove('is-active');
    if (menuBtn) {
        menuBtn.setAttribute('aria-expanded', 'false');
    }
}

// Функции для уведомлений
function showNotification(title, message, type = 'success', duration = 5000) {
    const notification = document.getElementById('notification');
    const notificationTitle = notification.querySelector('.notification-title');
    const notificationText = notification.querySelector('.notification-text');
    const notificationIcon = notification.querySelector('.notification-icon i');
    
    // Устанавливаем тип уведомления
    notification.className = 'notification';
    if (type === 'success') {
        notification.classList.add('notification-success');
        notificationIcon.className = 'fa-solid fa-check-circle';
    } else if (type === 'error') {
        notification.classList.add('notification-error');
        notificationIcon.className = 'fa-solid fa-triangle-exclamation';
    }
    
    // Устанавливаем текст
    notificationTitle.textContent = title;
    notificationText.textContent = message;
    
    // Toast must not lock body scroll — that causes page jump
    notification.classList.add('active');
    
    // Автоматическое закрытие через duration миллисекунд
    const autoCloseTimeout = setTimeout(() => {
        hideNotification();
    }, duration);
    
    // Сохраняем timeout для возможности отмены
    notification._autoCloseTimeout = autoCloseTimeout;
}

function hideNotification() {
    const notification = document.getElementById('notification');
    
    // Отменяем автоматическое закрытие, если оно еще не произошло
    if (notification._autoCloseTimeout) {
        clearTimeout(notification._autoCloseTimeout);
        notification._autoCloseTimeout = null;
    }
    
    notification.classList.remove('active');
}

// Обработчики форм с валидацией
function handleContactSubmit(event) {
    event.preventDefault();
    const form = event.target;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Здесь будет отправка на сервер
    // Показываем уведомление об успешной отправке
    showNotification(
        'Сообщение отправлено!',
        'Мы свяжемся с вами в ближайшее время.',
        'success'
    );
    form.reset();
}

// Подсветка нужных обхватов и required — поля всегда видны
function updateCalculatorFields() {
    const productType = document.getElementById('product-type')?.value || 'bra';
    const resultDiv = document.getElementById('calculator-result');
    const measures = document.getElementById('calculator-measures');

    if (resultDiv) {
        resultDiv.classList.add('hidden');
        resultDiv.style.display = 'none';
        resultDiv.innerHTML = '';
    }

    const bandSizeInput = document.getElementById('band-size');
    const bustSizeInput = document.getElementById('bust-size');
    const waistSizeInput = document.getElementById('waist-size');
    const hipSizeInput = document.getElementById('hip-size');

    [bandSizeInput, bustSizeInput, waistSizeInput, hipSizeInput].forEach((input) => {
        if (input) input.removeAttribute('required');
    });

    if (measures) {
        measures.querySelectorAll('[data-measure]').forEach((group) => {
            group.classList.remove('form-group--needed');
            group.classList.add('form-group--optional');
        });
    }

    const need = (keys) => {
        keys.forEach((key) => {
            const group = measures?.querySelector(`[data-measure="${key}"]`);
            if (group) {
                group.classList.add('form-group--needed');
                group.classList.remove('form-group--optional');
            }
        });
    };

    if (productType === 'bra') {
        need(['band', 'bust']);
        if (bandSizeInput) bandSizeInput.setAttribute('required', 'required');
        if (bustSizeInput) bustSizeInput.setAttribute('required', 'required');
    } else if (productType === 'panties') {
        need(['hip']);
        if (hipSizeInput) hipSizeInput.setAttribute('required', 'required');
    } else if (productType === 'clothing') {
        need(['bust', 'waist', 'hip']);
        if (bustSizeInput) bustSizeInput.setAttribute('required', 'required');
        if (waistSizeInput) waistSizeInput.setAttribute('required', 'required');
        if (hipSizeInput) hipSizeInput.setAttribute('required', 'required');
    }
}

// Данные для расчета размеров бюстгальтеров
const braSizeData = {
    // Размер: [мин обхват под грудью, макс обхват под грудью]
    sizes: {
        65: [63, 67],
        70: [66, 72],
        75: [73, 77],
        80: [78, 82],
        85: [83, 87],
        90: [88, 92],
        95: [93, 97]
    },
    // Чашка: [размер]: [мин обхват груди, макс обхват груди]
    cups: {
        65: { A: [77, 79], B: [79, 81], C: [81, 83], D: [83, 85] },
        70: { A: [82, 84], B: [84, 86], C: [86, 88], D: [88, 90], E: [90, 92], F: [92, 94], G: [94, 96] },
        75: { A: [87, 89], B: [89, 91], C: [91, 93], D: [93, 95], E: [95, 97], F: [97, 99], G: [99, 101] },
        80: { A: [92, 94], B: [94, 96], C: [96, 98], D: [98, 100], E: [100, 102], F: [102, 104], G: [104, 106] },
        85: { A: [97, 99], B: [99, 101], C: [101, 103], D: [103, 105], E: [105, 107], F: [107, 109], G: [109, 111] },
        90: { A: [102, 104], B: [104, 106], C: [106, 108], D: [108, 110], E: [110, 112], F: [112, 114], G: [114, 116] },
        95: { A: [107, 109], B: [109, 111], C: [111, 113], D: [113, 115], E: [115, 117], F: [117, 119], G: [119, 121] }
    }
};

// Данные для расчета размеров трусов
const pantiesSizeData = {
    // Обхват бёдер: [мин, макс] -> размеры
    sizes: [
        { range: [86, 90], ru: '40', eu: '38', int: 'XS' },
        { range: [91, 95], ru: '42', eu: '40', int: 'S' },
        { range: [96, 100], ru: '44', eu: '42', int: 'M' },
        { range: [101, 105], ru: '46', eu: '44', int: 'L' },
        { range: [106, 110], ru: '48', eu: '46', int: 'XL' }
    ]
};

// Данные для расчета размеров одежды/пижамы
const clothingSizeData = {
    sizes: [
        { 
            int: 'XS', 
            ru: '40', 
            eu: '38', 
            bust: [78, 82], 
            waist: [58, 62], 
            hip: [86, 90] 
        },
        { 
            int: 'S', 
            ru: '42', 
            eu: '40', 
            bust: [82, 86], 
            waist: [62, 66], 
            hip: [90, 94] 
        },
        { 
            int: 'M', 
            ru: '44', 
            eu: '42', 
            bust: [86, 90], 
            waist: [66, 70], 
            hip: [94, 98] 
        },
        { 
            int: 'L', 
            ru: '46', 
            eu: '44', 
            bust: [90, 96], 
            waist: [70, 76], 
            hip: [98, 104] 
        },
        { 
            int: 'XL', 
            ru: '48', 
            eu: '46', 
            bust: [96, 102], 
            waist: [76, 82], 
            hip: [104, 110] 
        },
        { 
            int: 'XXL', 
            ru: '50', 
            eu: '48', 
            bust: [102, 108], 
            waist: [82, 88], 
            hip: [110, 116] 
        }
    ]
};

// Функция расчета размера бюстгальтера
function calculateBraSize(bandSize, bustSize) {
    // Определяем размер по обхвату под грудью
    let braSize = null;
    for (const [size, range] of Object.entries(braSizeData.sizes)) {
        if (bandSize >= range[0] && bandSize <= range[1]) {
            braSize = parseInt(size);
            break;
        }
    }
    
    if (!braSize) {
        return null;
    }
    
    // Определяем чашку по обхвату груди
    let cup = null;
    const cupsForSize = braSizeData.cups[braSize];
    
    if (cupsForSize) {
        for (const [cupLetter, range] of Object.entries(cupsForSize)) {
            if (bustSize >= range[0] && bustSize <= range[1]) {
                cup = cupLetter;
                break;
            }
        }
    }
    
    if (!cup) {
        // Если точного совпадения нет, ищем ближайший
        let minDiff = Infinity;
        let closestCup = null;
        
        for (const [cupLetter, range] of Object.entries(cupsForSize)) {
            const midPoint = (range[0] + range[1]) / 2;
            const diff = Math.abs(bustSize - midPoint);
            if (diff < minDiff) {
                minDiff = diff;
                closestCup = cupLetter;
            }
        }
        cup = closestCup;
    }
    
    return {
        size: braSize,
        cup: cup,
        fullSize: `${braSize}${cup}`
    };
}

// Функция расчета размера трусов
function calculatePantiesSize(hipSize) {
    for (const sizeInfo of pantiesSizeData.sizes) {
        if (hipSize >= sizeInfo.range[0] && hipSize <= sizeInfo.range[1]) {
            return {
                ru: sizeInfo.ru,
                eu: sizeInfo.eu,
                int: sizeInfo.int
            };
        }
    }
    
    // Если точного совпадения нет, ищем ближайший
    let minDiff = Infinity;
    let closestSize = null;
    
    for (const sizeInfo of pantiesSizeData.sizes) {
        const midPoint = (sizeInfo.range[0] + sizeInfo.range[1]) / 2;
        const diff = Math.abs(hipSize - midPoint);
        if (diff < minDiff) {
            minDiff = diff;
            closestSize = sizeInfo;
        }
    }
    
    return closestSize ? {
        ru: closestSize.ru,
        eu: closestSize.eu,
        int: closestSize.int
    } : null;
}

// Функция расчета размера одежды/пижамы
function calculateClothingSize(bustSize, waistSize, hipSize) {
    // Подсчитываем количество совпадений для каждого размера
    const sizeMatches = clothingSizeData.sizes.map(sizeInfo => {
        let matches = 0;
        let totalDiff = 0;
        
        // Проверяем обхват груди
        if (bustSize >= sizeInfo.bust[0] && bustSize <= sizeInfo.bust[1]) {
            matches++;
        } else {
            const midPoint = (sizeInfo.bust[0] + sizeInfo.bust[1]) / 2;
            totalDiff += Math.abs(bustSize - midPoint);
        }
        
        // Проверяем обхват талии
        if (waistSize >= sizeInfo.waist[0] && waistSize <= sizeInfo.waist[1]) {
            matches++;
        } else {
            const midPoint = (sizeInfo.waist[0] + sizeInfo.waist[1]) / 2;
            totalDiff += Math.abs(waistSize - midPoint);
        }
        
        // Проверяем обхват бёдер
        if (hipSize >= sizeInfo.hip[0] && hipSize <= sizeInfo.hip[1]) {
            matches++;
        } else {
            const midPoint = (sizeInfo.hip[0] + sizeInfo.hip[1]) / 2;
            totalDiff += Math.abs(hipSize - midPoint);
        }
        
        return {
            sizeInfo: sizeInfo,
            matches: matches,
            totalDiff: totalDiff
        };
    });
    
    // Сортируем по количеству совпадений (больше = лучше), затем по минимальной разнице
    sizeMatches.sort((a, b) => {
        if (b.matches !== a.matches) {
            return b.matches - a.matches;
        }
        return a.totalDiff - b.totalDiff;
    });
    
    const bestMatch = sizeMatches[0];
    
    if (bestMatch && bestMatch.matches >= 1) {
        return {
            int: bestMatch.sizeInfo.int,
            ru: bestMatch.sizeInfo.ru,
            eu: bestMatch.sizeInfo.eu,
            matches: bestMatch.matches,
            totalDiff: bestMatch.totalDiff
        };
    }
    
    return null;
}

// Обработчик отправки формы калькулятора
function handleSizeCalculatorSubmit(event) {
    event.preventDefault();
    const form = event.target;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const productType = document.getElementById('product-type').value;
    const resultDiv = document.getElementById('calculator-result');
    
    if (!resultDiv) return;
    
    let result = null;
    let resultHTML = '';
    
    if (productType === 'bra') {
        const bandSize = parseInt(document.getElementById('band-size').value);
        const bustSize = parseInt(document.getElementById('bust-size').value);
        
        result = calculateBraSize(bandSize, bustSize);
        
        if (result) {
            resultHTML = `
                <div class="calculator-result-content">
                    <h4 class="calculator-result-title">Рекомендуемый размер бюстгальтера:</h4>
                    <div class="calculator-result-size">${result.fullSize}</div>
                    <div class="calculator-result-details">
                        <p><strong>Размер:</strong> ${result.size}</p>
                        <p><strong>Чашка:</strong> ${result.cup}</p>
                    </div>
                </div>
            `;
        } else {
            resultHTML = `
                <div class="calculator-result-content calculator-result-error">
                    <p>Не удалось определить размер. Пожалуйста, проверьте введенные значения.</p>
                    <p class="calculator-result-hint">Обхват под грудью должен быть от 63 до 97 см.</p>
                </div>
            `;
        }
    } else if (productType === 'panties') {
        const hipSize = parseInt(document.getElementById('hip-size').value);
        
        result = calculatePantiesSize(hipSize);
        
        if (result) {
            resultHTML = `
                <div class="calculator-result-content">
                    <h4 class="calculator-result-title">Рекомендуемый размер трусов:</h4>
                    <div class="calculator-result-sizes">
                        <div class="calculator-result-size-item">
                            <span class="calculator-result-label">Международный:</span>
                            <span class="calculator-result-value">${result.int}</span>
                        </div>
                        <div class="calculator-result-size-item">
                            <span class="calculator-result-label">Российский:</span>
                            <span class="calculator-result-value">${result.ru}</span>
                        </div>
                        <div class="calculator-result-size-item">
                            <span class="calculator-result-label">Европейский:</span>
                            <span class="calculator-result-value">${result.eu}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            resultHTML = `
                <div class="calculator-result-content calculator-result-error">
                    <p>Не удалось определить размер. Пожалуйста, проверьте введенное значение.</p>
                    <p class="calculator-result-hint">Обхват бёдер должен быть от 86 до 110 см.</p>
                </div>
            `;
        }
    } else if (productType === 'clothing') {
        const bustSize = parseInt(document.getElementById('bust-size').value);
        const waistSize = parseInt(document.getElementById('waist-size').value);
        const hipSize = parseInt(document.getElementById('hip-size').value);
        
        result = calculateClothingSize(bustSize, waistSize, hipSize);
        
        if (result) {
            let matchInfo = '';
            if (result.matches === 3) {
                matchInfo = '<p class="calculator-result-match calculator-result-match-success">✓ Все параметры соответствуют размеру</p>';
            } else if (result.matches === 2) {
                matchInfo = '<p class="calculator-result-match calculator-result-match-success">✓ Два параметра соответствуют размеру</p>';
            } else {
                matchInfo = '<p class="calculator-result-match calculator-result-match-warning">⚠ Размер рассчитан по ближайшим значениям</p>';
            }
            
            resultHTML = `
                <div class="calculator-result-content">
                    <h4 class="calculator-result-title">Рекомендуемый размер одежды/пижамы:</h4>
                    <div class="calculator-result-size">${result.int}</div>
                    ${matchInfo}
                    <div class="calculator-result-sizes">
                        <div class="calculator-result-size-item">
                            <span class="calculator-result-label">Международный:</span>
                            <span class="calculator-result-value">${result.int}</span>
                        </div>
                        <div class="calculator-result-size-item">
                            <span class="calculator-result-label">Российский:</span>
                            <span class="calculator-result-value">${result.ru}</span>
                        </div>
                        <div class="calculator-result-size-item">
                            <span class="calculator-result-label">Европейский:</span>
                            <span class="calculator-result-value">${result.eu}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            resultHTML = `
                <div class="calculator-result-content calculator-result-error">
                    <p>Не удалось определить размер. Пожалуйста, проверьте введенные значения.</p>
                    <p class="calculator-result-hint">Обхват груди: 78-108 см, талии: 58-88 см, бёдер: 86-116 см.</p>
                </div>
            `;
        }
    }
    
    if (resultHTML) {
        resultDiv.innerHTML = resultHTML;
        resultDiv.classList.remove('hidden');
        resultDiv.style.display = 'block';
        
        // Прокручиваем к результату
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Закрытие меню по ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const menuOverlay = document.getElementById('menu-overlay');
        if (menuOverlay && menuOverlay.classList.contains('active')) {
            closeMenu();
        }
        // Закрытие модального окна руководства по размерам
        const sizeGuideModal = document.getElementById('size-guide-modal');
        if (sizeGuideModal && sizeGuideModal.classList.contains('active')) {
            closeSizeGuideModal();
        }
        const sizeCalculatorModal = document.getElementById('size-calculator-modal');
        if (sizeCalculatorModal && sizeCalculatorModal.classList.contains('active')) {
            closeSizeCalculatorModal();
        }
        // Закрытие уведомления
        const notification = document.getElementById('notification');
        if (notification && notification.classList.contains('active')) {
            hideNotification();
        }
    }
});

// Функции для модального окна руководства по размерам
function openSizeGuideModal() {
    const modal = document.getElementById('size-guide-modal');
    if (!modal || modal.classList.contains('active')) return;
    closeSizeCalculatorModal();
    modal.classList.add('active');
    lockBodyScroll();
}

function closeSizeGuideModal() {
    const modal = document.getElementById('size-guide-modal');
    if (modal?.classList.contains('active')) {
        modal.classList.remove('active');
        unlockBodyScroll();
    }
}

function openSizeCalculatorModal() {
    const modal = document.getElementById('size-calculator-modal');
    if (!modal || modal.classList.contains('active')) return;
    closeSizeGuideModal();
    modal.classList.add('active');
    lockBodyScroll();
    updateCalculatorFields();
    const firstMeasure = modal.querySelector('#band-size');
    if (firstMeasure) {
        setTimeout(() => firstMeasure.focus(), 100);
    }
}

function closeSizeCalculatorModal() {
    const modal = document.getElementById('size-calculator-modal');
    if (modal?.classList.contains('active')) {
        modal.classList.remove('active');
        unlockBodyScroll();
    }
}

// Функция для получения класса иконки по теме
function getIconClass(theme) {
    return theme === 'dark' ? 'fa-moon' : 'fa-sun';
}

// Функция для обновления иконки Font Awesome (работает с SVG от autoReplaceSvg: 'nest')
function updateIconElement(iconContainer, iconClass) {
    if (!iconContainer) return;
    
    // Font Awesome с autoReplaceSvg: 'nest' создает SVG внутри <i>
    // Для правильной работы нужно полностью пересоздать элемент <i>
    const iconElement = iconContainer.querySelector('i');
    
    if (iconElement) {
        // Сохраняем атрибут aria-hidden
        const ariaHidden = iconElement.getAttribute('aria-hidden');
        
        // Создаем новый элемент <i> с правильным классом
        const newIconElement = document.createElement('i');
        newIconElement.className = 'fa-solid ' + iconClass;
        if (ariaHidden) {
            newIconElement.setAttribute('aria-hidden', ariaHidden);
        }
        
        // Заменяем старый элемент новым
        iconElement.replaceWith(newIconElement);
        
        // Font Awesome автоматически создаст SVG внутри нового элемента
    }
}

// Функция для синхронизации иконок с текущей темой
function syncThemeIcon() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const themeToggle = document.getElementById('theme-toggle');
    
    if (!themeToggle) return;
    
    const currentSpan = themeToggle.querySelector('.icon--current');
    const nextSpan = themeToggle.querySelector('.icon--next');
    
    if (!currentSpan || !nextSpan) return;
    
    // Текущая иконка должна показывать текущую тему
    // Следующая иконка должна показывать противоположную тему
    const currentIconClass = getIconClass(currentTheme);
    const nextIconClass = getIconClass(currentTheme === 'light' ? 'dark' : 'light');
    
    // Обновляем иконки с учетом SVG от Font Awesome
    // Передаем span контейнер, функция сама найдет и обновит <i> элемент внутри
    updateIconElement(currentSpan, currentIconClass);
    updateIconElement(nextSpan, nextIconClass);
}

// Тема: quiet luxury — только light
function toggleTheme() {
    /* dark theme removed */
}

function initTheme() {
    document.documentElement.setAttribute('data-theme', 'light');
    try {
        localStorage.setItem('theme', 'light');
    } catch (_) { /* ignore */ }
}

// ==========================================================================
// МОДАЛЬНОЕ ОКНО БЫСТРОГО ПРОСМОТРА ТОВАРА
// Определяем функции ДО DOMContentLoaded, чтобы они были доступны из onclick
// ==========================================================================

// Вспомогательная функция для открытия модального окна из карточки товара
function openQuickViewFromCard(button) {
    if (!button) return;

    const productCard = button.closest('.product-card');
    if (!productCard) return;

    const productId = productCard.getAttribute('data-product-id');
    if (productId) {
        openQuickViewModal(productId);
        return;
    }

    const name = productCard.querySelector('.product-name')?.textContent || '';
    const description = productCard.querySelector('.product-desc')?.textContent || '';
    const priceText = productCard.querySelector('.product-price')?.textContent || '';
    const image = productCard.querySelector('img')?.src || '';
    const badge = productCard.querySelector('.product-badge');

    const priceMatch = priceText.match(/[\d\s]+/);
    const price = priceMatch ? parseInt(priceMatch[0].replace(/\s/g, '')) : 0;

    const product = {
        id: null,
        name,
        description,
        price,
        originalPrice: null,
        image,
        sizes: ['S', 'M', 'L', 'XL'],
        isNew: badge?.classList.contains('badge-new') || false,
        isBestseller: badge?.classList.contains('bestseller') || badge?.classList.contains('badge-bestseller') || false,
    };

    openQuickViewModalWithData(product);
}

// Функция открытия модального окна быстрого просмотра с данными товара
function openQuickViewModalWithData(product) {
    // Заполняем модальное окно данными товара
    const modal = document.getElementById('quick-view-modal');
    if (!modal) {
        console.error('Модальное окно quick-view-modal не найдено в DOM');
        return;
    }
    
    if (!product) {
        console.error('Данные товара не переданы в openQuickViewModalWithData');
        return;
    }
    
    // Изображение
    const imageEl = document.getElementById('quick-view-image');
    if (imageEl) {
        imageEl.src = product.image;
        imageEl.alt = product.name;
    }
    
    // Название
    const nameEl = document.getElementById('quick-view-name');
    if (nameEl) {
        nameEl.textContent = product.name;
    }
    
    // Описание
    const descriptionEl = document.getElementById('quick-view-description');
    if (descriptionEl) {
        descriptionEl.textContent = product.description;
    }
    
    // Цена
    const priceEl = document.getElementById('quick-view-price');
    const originalPriceEl = document.getElementById('quick-view-original-price');
    if (priceEl) {
        if (product.originalPrice) {
            priceEl.textContent = `${product.price.toLocaleString('ru-RU')} ₽`;
            if (originalPriceEl) {
                originalPriceEl.textContent = `${product.originalPrice.toLocaleString('ru-RU')} ₽`;
                originalPriceEl.style.display = 'block';
            }
        } else {
            priceEl.textContent = `${product.price.toLocaleString('ru-RU')} ₽`;
            if (originalPriceEl) {
                originalPriceEl.style.display = 'none';
            }
        }
    }
    
    // Размеры
    const sizesListEl = document.getElementById('quick-view-sizes-list');
    selectedQuickViewSize = '';
    quickViewProductId = product.id || null;
    const bindQuickSizes = (selected) => {
        selectedQuickViewSize = selected || '';
        if (!sizesListEl) return;
        const list = product.sizes || [];
        sizesListEl.innerHTML = list
            .map(
                (s) =>
                    `<button type="button" class="quick-view-size-item${selectedQuickViewSize === s ? ' is-selected' : ''}" data-size="${s}" aria-pressed="${selectedQuickViewSize === s}">${s}</button>`
            )
            .join('');
        sizesListEl.querySelectorAll('[data-size]').forEach((btn) => {
            btn.addEventListener('click', () => bindQuickSizes(btn.getAttribute('data-size')));
        });
        const addBtn = document.getElementById('quick-view-order-btn');
        if (addBtn) addBtn.disabled = !selectedQuickViewSize;
    };
    bindQuickSizes('');
    
    // Бейдж
    const badgeEl = document.getElementById('quick-view-badge');
    if (badgeEl) {
        if (product.isNew) {
            badgeEl.textContent = 'NEW';
            badgeEl.className = 'quick-view-badge badge-new';
            badgeEl.style.display = 'block';
        } else if (product.isBestseller) {
            badgeEl.textContent = 'BESTSELLER';
            badgeEl.className = 'quick-view-badge bestseller';
            badgeEl.style.display = 'block';
        } else {
            badgeEl.style.display = 'none';
        }
    }
    
    const orderBtn = document.getElementById('quick-view-order-btn');
    if (orderBtn) {
        orderBtn.disabled = true;
        orderBtn.onclick = () => {
            if (!quickViewProductId) return;
            if (!selectedQuickViewSize) {
                showNotification('Выберите размер', 'Укажите размер перед добавлением в корзину.', 'error', 3000);
                return;
            }
            if (handleAddToCart(quickViewProductId, selectedQuickViewSize)) {
                // keep modal open so user can continue
            }
        };
    }

    const detailsBtn = document.getElementById('quick-view-details-btn');
    if (detailsBtn && product.id) {
        detailsBtn.href = `product.html?id=${product.id}`;
        detailsBtn.classList.remove('hidden');
    }
    
    // Открываем модальное окно
    if (!modal.classList.contains('active')) {
        modal.classList.add('active');
        lockBodyScroll();
    }
    // Устанавливаем aria-hidden для основного контента
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.setAttribute('aria-hidden', 'true');
    }
    
    // Фокус на кнопке закрытия для доступности
    const closeBtn = modal.querySelector('.quick-view-modal-close');
    if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 100);
    }
}

// Функция открытия модального окна быстрого просмотра
function openQuickViewModal(productId) {
    const fromData = getProductById(productId);
    if (fromData) {
        openQuickViewModalWithData(fromData);
        return;
    }

    // Fallback: данные из DOM-карточки
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    
    if (productCard) {
        const name = productCard.querySelector('.product-name')?.textContent || '';
        const description = productCard.querySelector('.product-desc')?.textContent || '';
        const priceText = productCard.querySelector('.product-price')?.textContent || '';
        const image = productCard.querySelector('img')?.src || '';
        const badge = productCard.querySelector('.product-badge');
        
        const priceMatch = priceText.match(/[\d\s]+/);
        const price = priceMatch ? parseInt(priceMatch[0].replace(/\s/g, '')) : 0;
        
        const product = {
            id: productId,
            name: name,
            description: description,
            price: price,
            originalPrice: null,
            image: image,
            sizes: ['S', 'M', 'L', 'XL'], // По умолчанию
            isNew: badge?.classList.contains('badge-new') || false,
            isBestseller: badge?.classList.contains('bestseller') || false
        };
        
        // Используем общую функцию для заполнения модального окна
        if (typeof openQuickViewModalWithData === 'function') {
            openQuickViewModalWithData(product);
        } else if (window.openQuickViewModalWithData) {
            window.openQuickViewModalWithData(product);
        } else {
            console.error('Функция openQuickViewModalWithData не доступна');
        }
        return;
    }
    
    // Если не нашли в DOM, ищем в каталоге товаров (для страницы каталога)
    if (typeof catalogProducts !== 'undefined') {
        const product = catalogProducts.find(p => p.id === productId);
        if (product) {
            if (typeof openQuickViewModalWithData === 'function') {
                openQuickViewModalWithData(product);
            } else if (window.openQuickViewModalWithData) {
                window.openQuickViewModalWithData(product);
            }
            return;
        }
    }
    
    // Если товар не найден ни в DOM, ни в каталоге
    console.error('Товар не найден:', productId);
}

// Функция закрытия модального окна быстрого просмотра
function closeQuickViewModal() {
    const modal = document.getElementById('quick-view-modal');
    if (modal?.classList.contains('active')) {
        modal.classList.remove('active');
        unlockBodyScroll();
        
        // Убираем aria-hidden с основного контента
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.removeAttribute('aria-hidden');
        }
    }
}

// Экспортируем функции в window сразу после определения для надежности
if (typeof window !== 'undefined') {
    window.openQuickViewModal = openQuickViewModal;
    window.openQuickViewModalWithData = openQuickViewModalWithData;
    window.closeQuickViewModal = closeQuickViewModal;
    window.openQuickViewFromCard = openQuickViewFromCard;
}

document.addEventListener('DOMContentLoaded', function() {
    // Enable menu transitions only after first paint (prevents open→close FOUC)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.documentElement.classList.add('ui-ready');
        });
    });

    initTheme();
    renderFeaturedProducts();
    initProductPage();
    initCatalogSearch();
    initCustomSelects();
    updateFavoritesBadge();
    updateCartBadge();
    initCartPage();
    bindProductCarouselMedia();
    initProductCarousels();
    initTouchProductOverlays();
    
    // Наблюдатель за изменением атрибута data-theme для синхронизации иконки
    const themeObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                syncThemeIcon();
            }
        });
    });
    
    // Наблюдаем за изменениями атрибута data-theme на элементе html
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
    
    // Скрытие шапки при скролле вниз, появление при скролле вверх
    const header = document.getElementById('header');
    if (header) {
        let lastScrollY = window.scrollY || window.pageYOffset;
        let ticking = false;
        const scrollThreshold = 80;

        function updateHeaderScroll() {
            const scrollY = window.scrollY || window.pageYOffset;
            const menuOverlay = document.getElementById('menu-overlay');
            if (menuOverlay && menuOverlay.classList.contains('active')) {
                header.classList.remove('header-hidden');
                lastScrollY = scrollY;
                ticking = false;
                return;
            }
            // Avoid header show/hide thrash during pagination / programmatic scroll
            if (isProgrammaticScrollActive() || document.documentElement.classList.contains('is-scroll-locked')) {
                header.classList.remove('header-hidden');
                lastScrollY = scrollY;
                ticking = false;
                return;
            }
            if (scrollY < scrollThreshold) {
                header.classList.remove('header-hidden');
            } else if (scrollY > lastScrollY) {
                header.classList.add('header-hidden');
            } else {
                header.classList.remove('header-hidden');
            }
            lastScrollY = scrollY;
            ticking = false;
        }

        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(updateHeaderScroll);
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Закрытие меню при клике вне его
    const menuOverlay = document.getElementById('menu-overlay');
    if (menuOverlay) {
        menuOverlay.addEventListener('click', function(event) {
            if (event.target === this) {
                closeMenu();
            }
        });
    }
    
    // Закрытие модального окна руководства по размерам при клике на overlay
    const sizeGuideModal = document.getElementById('size-guide-modal');
    if (sizeGuideModal) {
        const overlay = sizeGuideModal.querySelector('.size-guide-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', function() {
                closeSizeGuideModal();
            });
        }
    }
    
    // Закрытие уведомления при клике на overlay или кнопку закрытия
    const notification = document.getElementById('notification');
    if (notification) {
        const notificationOverlay = notification.querySelector('.notification-overlay');
        const notificationClose = notification.querySelector('.notification-close');
        
        if (notificationOverlay) {
            notificationOverlay.addEventListener('click', function() {
                hideNotification();
            });
        }
        
        if (notificationClose) {
            notificationClose.addEventListener('click', function() {
                hideNotification();
            });
        }
    }
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // document.querySelectorAll('section').forEach(section => {
    //     section.style.opacity = '0';
    //     section.style.transform = 'translateY(30px)';
    //     section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    //     observer.observe(section);
    // });
    
    // Инициализация каталога, если мы на странице каталога
    if (document.getElementById('catalog-page')) {
        initCatalog();
    }
    
    // Обработчики клика на кнопки "БЫСТРЫЙ ПРОСМОТР" для статических карточек на главной странице
    // Используем делегирование событий для надежности
    function handleQuickViewClick(e) {
        // Проверяем, был ли клик по кнопке быстрого просмотра или её дочернему элементу
        const button = e.target.closest('.quick-view-btn');
        if (!button) {
            // Не клик по кнопке быстрого просмотра, игнорируем
            return;
        }
        
        // Клик по кнопке быстрого просмотра обнаружен
        
        // Пропускаем ссылки, которые ведут на другую страницу
        if (button.tagName === 'A' && button.getAttribute('href') && !button.getAttribute('href').startsWith('#')) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        // Используем window для доступа к функциям (на случай модульной загрузки)
        let openModal = window.openQuickViewModal;
        let openModalWithData = window.openQuickViewModalWithData;
        
        // Если функции не в window, но доступны в области видимости, используем их напрямую
        if (!openModalWithData && typeof openQuickViewModalWithData === 'function') {
            openModalWithData = openQuickViewModalWithData;
        }
        if (!openModal && typeof openQuickViewModal === 'function') {
            openModal = openQuickViewModal;
        }
        
        if (!openModalWithData) {
            console.error('Функция openQuickViewModalWithData не доступна. Попробуйте обновить страницу.');
            return;
        }
        
        // Сначала проверяем, есть ли data-product-id прямо на кнопке
        const buttonProductId = button.getAttribute('data-product-id');
        if (buttonProductId && openModal) {
            openModal(parseInt(buttonProductId));
            return;
        }
        
        // Находим родительскую карточку товара
        const productCard = button.closest('.product-card');
        if (!productCard) {
            // Если не нашли .product-card, ищем в карусели
            const carouselItem = button.closest('.carousel-item');
            if (carouselItem) {
                // Получаем данные из карусели
                const name = carouselItem.querySelector('.product-name')?.textContent || '';
                const description = carouselItem.querySelector('.product-desc')?.textContent || '';
                const priceText = carouselItem.querySelector('.product-price')?.textContent || '';
                const image = carouselItem.querySelector('img')?.src || '';
                
                // Парсим цену
                const priceMatch = priceText.match(/[\d\s]+/);
                const price = priceMatch ? parseInt(priceMatch[0].replace(/\s/g, '')) : 0;
                
                // Создаем временный объект товара
                const tempProduct = {
                    id: Date.now(), // Временный ID
                    name: name,
                    description: description,
                    price: price,
                    originalPrice: null,
                    image: image,
                    sizes: ['S', 'M', 'L', 'XL'], // По умолчанию
                    isNew: false,
                    isBestseller: false
                };
                
                // Открываем модальное окно с данными товара
                openModalWithData(tempProduct);
                return;
            }
            return;
        }
        
        // Получаем ID товара из data-атрибута карточки
        const productId = productCard.getAttribute('data-product-id');
        if (productId && openModal) {
            openModal(parseInt(productId));
        } else {
            // Если нет ID, получаем данные напрямую из карточки
            const name = productCard.querySelector('.product-name')?.textContent || '';
            const description = productCard.querySelector('.product-desc')?.textContent || '';
            const priceText = productCard.querySelector('.product-price')?.textContent || '';
            const image = productCard.querySelector('img')?.src || '';
            const badge = productCard.querySelector('.product-badge');
            
            // Парсим цену
            const priceMatch = priceText.match(/[\d\s]+/);
            const price = priceMatch ? parseInt(priceMatch[0].replace(/\s/g, '')) : 0;
            
            // Создаем временный объект товара
            const tempProduct = {
                id: Date.now(), // Временный ID
                name: name,
                description: description,
                price: price,
                originalPrice: null,
                image: image,
                sizes: ['S', 'M', 'L', 'XL'], // По умолчанию
                isNew: badge?.classList.contains('badge-new') || false,
                isBestseller: badge?.classList.contains('bestseller') || false
            };
            
            // Открываем модальное окно с данными товара
            openModalWithData(tempProduct);
        }
    }
    
    // Проверяем наличие модального окна в DOM
    const quickViewModal = document.getElementById('quick-view-modal');
    if (!quickViewModal) {
        console.error('Модальное окно quick-view-modal не найдено в DOM при инициализации');
    }
    
    // Используем делегирование событий на document для надежности
    document.addEventListener('click', handleQuickViewClick);
    
    // Закрытие модального окна быстрого просмотра по ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const quickViewModal = document.getElementById('quick-view-modal');
            if (quickViewModal && quickViewModal.classList.contains('active')) {
                closeQuickViewModal();
            }
        }
    });
    
    // Закрытие модального окна быстрого просмотра при клике на overlay
    const quickViewModalOverlay = document.querySelector('.quick-view-modal-overlay');
    if (quickViewModalOverlay) {
        quickViewModalOverlay.addEventListener('click', function() {
            closeQuickViewModal();
        });
    }
});

// ==========================================================================
// КАТАЛОГ - Mock данные и функции
// ==========================================================================

// Mock данные товаров
// catalogProducts imported from ./data/products.js

// Глобальные переменные для каталога
let filteredProducts = [...catalogProducts];
let currentSort = 'popularity';
let activeFilters = {
    type: [],
    category: [],
    size: []
};

// Переменные для пагинации
let currentPage = 1;
const itemsPerPage = 30;

// Функции-обертки для пагинации (для использования в onclick)
function goToPrevPage() {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

// Функции управления модальным окном фильтров
function openFiltersModal() {
    const modal = document.getElementById('filters-modal');
    const filterBtn = document.getElementById('filter-btn');
    if (modal && filterBtn && !modal.classList.contains('active')) {
        // Восстанавливаем состояние чекбоксов из активных фильтров
        restoreFilterState();
        
        modal.classList.add('active');
        filterBtn.setAttribute('aria-expanded', 'true');
        lockBodyScroll();
        
        // Фокус на первом элементе для доступности
        const firstInput = modal.querySelector('.filter-input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Устанавливаем aria-hidden для основного контента
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.setAttribute('aria-hidden', 'true');
        }
    }
}

// Функция восстановления состояния фильтров в модальном окне
function restoreFilterState() {
    // Восстанавливаем чекбоксы типов
    document.querySelectorAll('input[name="type"]').forEach(input => {
        input.checked = activeFilters.type.includes(input.value);
    });
    
    // Восстанавливаем чекбоксы категорий
    document.querySelectorAll('input[name="category"]').forEach(input => {
        input.checked = activeFilters.category.includes(input.value);
    });
    
    // Восстанавливаем чекбоксы размеров
    document.querySelectorAll('input[name="size"]').forEach(input => {
        input.checked = activeFilters.size.includes(input.value);
    });
    
    // Обновляем счетчик
    updateFilterCount();
}

function closeFiltersModal() {
    const modal = document.getElementById('filters-modal');
    const filterBtn = document.getElementById('filter-btn');
    if (modal && filterBtn) {
        // Восстанавливаем состояние чекбоксов из активных фильтров
        // (отменяем несохраненные изменения)
        restoreFilterState();
        
        if (modal.classList.contains('active')) {
            modal.classList.remove('active');
            unlockBodyScroll();
        }
        filterBtn.setAttribute('aria-expanded', 'false');
        
        // Возвращаем фокус на кнопку фильтра
        filterBtn.focus();
        
        // Убираем aria-hidden с основного контента
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.removeAttribute('aria-hidden');
        }
    }
}

// Функция обновления счетчика активных фильтров
function updateFilterCount() {
    const typeInputs = document.querySelectorAll('input[name="type"]:checked');
    const categoryInputs = document.querySelectorAll('input[name="category"]:checked');
    const sizeInputs = document.querySelectorAll('input[name="size"]:checked');
    
    const totalCount = typeInputs.length + categoryInputs.length + sizeInputs.length;
    const filterCountEl = document.getElementById('filter-count');
    
    if (filterCountEl) {
        if (totalCount > 0) {
            filterCountEl.textContent = totalCount;
            filterCountEl.classList.remove('hidden');
        } else {
            filterCountEl.classList.add('hidden');
        }
    }
}

// Функция применения фильтров
function applyFilters() {
    // Собираем выбранные фильтры
    const selectedTypes = Array.from(document.querySelectorAll('input[name="type"]:checked')).map(cb => cb.value);
    const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
    const selectedSizes = Array.from(document.querySelectorAll('input[name="size"]:checked')).map(cb => cb.value);
    
    // Сохраняем активные фильтры
    activeFilters = {
        type: selectedTypes,
        category: selectedCategories,
        size: selectedSizes
    };
    
    // Применяем фильтры к товарам
    applyFiltersToProducts();
    syncFiltersToURL();
    
    // Закрываем модальное окно
    closeFiltersModal();
}

// Функция применения фильтров к товарам (отдельно для возможности вызова без закрытия модального окна)
function applyFiltersToProducts() {
    // Применяем фильтры
    filteredProducts = catalogProducts.filter(product => {
        // Фильтр по типу: товар должен содержать хотя бы один выбранный тип
        if (activeFilters.type.length > 0) {
            const hasType = activeFilters.type.some(type => product.type.includes(type));
            if (!hasType) return false;
        }
        
        // Фильтр по категории: товар должен содержать хотя бы одну выбранную категорию
        if (activeFilters.category.length > 0) {
            const hasCategory = activeFilters.category.some(cat => product.category.includes(cat));
            if (!hasCategory) return false;
        }
        
        // Фильтр по размеру: товар должен иметь хотя бы один выбранный размер
        if (activeFilters.size.length > 0) {
            const hasSize = activeFilters.size.some(size => product.sizes.includes(size));
            if (!hasSize) return false;
        }

        if (catalogSearchQuery) {
            const hay = `${product.name} ${product.description}`.toLowerCase();
            if (!hay.includes(catalogSearchQuery)) return false;
        }

        return true;
    });
    
    // Применяем текущую сортировку к отфильтрованным товарам
    filteredProducts.sort((a, b) => {
        switch (currentSort) {
            case 'popularity':
                // Сначала бестселлеры, затем обычные товары
                // Внутри каждой группы сортируем по популярности (по убыванию)
                if (a.isBestseller && !b.isBestseller) return -1;
                if (!a.isBestseller && b.isBestseller) return 1;
                return b.popularity - a.popularity;
            case 'price-asc':
                return a.price - b.price;
            case 'price-desc':
                return b.price - a.price;
            case 'discount':
                return b.discount - a.discount;
            case 'newest':
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            default:
                return 0;
        }
    });
    
    // Сбрасываем на первую страницу при применении фильтров
    currentPage = 1;
    
    // Обновляем отображение
    renderProducts(filteredProducts);
    updateProductCount(filteredProducts.length);
    updateFilterCount();
}

// Функция сброса фильтров
function resetFilters() {
    // Сбрасываем все чекбоксы
    document.querySelectorAll('.filter-input').forEach(input => {
        input.checked = false;
    });
    
    // Сбрасываем активные фильтры
    activeFilters = {
        type: [],
        category: [],
        size: []
    };
    
    // Показываем все товары
    filteredProducts = [...catalogProducts];
    
    // Сбрасываем на первую страницу
    currentPage = 1;
    
    // Применяем текущую сортировку
    sortProducts(currentSort);
    
    // Обновляем отображение
    renderProducts(filteredProducts);
    updateProductCount(filteredProducts.length);
    updateFilterCount();
    syncFiltersToURL();
    
    // Если модальное окно открыто, не закрываем его (пользователь может продолжить выбор)
}

// Функция сортировки товаров
function sortProducts(sortType) {
    currentSort = sortType;
    
    // Если есть активные фильтры, применяем их (они уже применят сортировку)
    if (activeFilters.type.length > 0 || activeFilters.category.length > 0 || activeFilters.size.length > 0) {
        // Применяем фильтры и сортировку
        applyFiltersToProducts();
        return; // applyFiltersToProducts уже вызывает renderProducts
    }
    
    // Если фильтров нет, сортируем все товары
    filteredProducts = [...catalogProducts];
    
    filteredProducts.sort((a, b) => {
        switch (sortType) {
            case 'popularity':
                // Сначала бестселлеры, затем обычные товары
                // Внутри каждой группы сортируем по популярности (по убыванию)
                if (a.isBestseller && !b.isBestseller) return -1;
                if (!a.isBestseller && b.isBestseller) return 1;
                return b.popularity - a.popularity;
            case 'price-asc':
                return a.price - b.price;
            case 'price-desc':
                return b.price - a.price;
            case 'discount':
                return b.discount - a.discount;
            case 'newest':
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            default:
                return 0;
        }
    });
    
    // Сбрасываем на первую страницу при изменении сортировки
    currentPage = 1;
    
    renderProducts(filteredProducts);
    updateProductCount(filteredProducts.length);
}

// Обработчик изменения сортировки
function handleSortChange(event) {
    const sortType = event.target.value;
    sortProducts(sortType);
}

/**
 * Custom select menus — native <select> popups mis-position under
 * backdrop-filter / isolation / transformed ancestors (modals).
 */
function positionCustomSelectMenu(host) {
    const trigger = host.querySelector('.custom-select-trigger');
    const menu = host._customSelectMenu || host.querySelector('.custom-select-menu');
    if (!trigger || !menu) return;

    // Portal to body — fixed coords break under transformed ancestors (modals)
    if (menu.parentElement !== document.body) {
        document.body.appendChild(menu);
    }

    menu.hidden = false;
    host.classList.remove('is-drop-up');

    menu.style.maxHeight = '';
    const triggerRect = trigger.getBoundingClientRect();
    const viewportPad = 8;
    const naturalHeight = menu.scrollHeight || 240;
    const preferredHeight = Math.min(naturalHeight, window.innerHeight * 0.45);
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPad;
    const spaceAbove = triggerRect.top - viewportPad;
    const minComfort = 140;
    const canFitBelow = spaceBelow >= Math.min(preferredHeight, minComfort);
    const dropUp = !canFitBelow && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
        96,
        Math.min(preferredHeight, dropUp ? spaceAbove - 8 : spaceBelow - 8)
    );

    host.classList.toggle('is-drop-up', dropUp);
    menu.classList.toggle('is-drop-up', dropUp);

    const width = Math.max(triggerRect.width, 160);
    let left = triggerRect.left;
    if (left + width > window.innerWidth - viewportPad) {
        left = Math.max(viewportPad, window.innerWidth - width - viewportPad);
    }

    menu.style.position = 'fixed';
    menu.style.left = `${Math.round(left)}px`;
    menu.style.width = `${Math.round(width)}px`;
    menu.style.right = 'auto';
    menu.style.zIndex = '3100';
    menu.style.maxHeight = `${Math.round(maxHeight)}px`;

    if (dropUp) {
        menu.style.top = 'auto';
        menu.style.bottom = `${Math.round(window.innerHeight - triggerRect.top + 6)}px`;
    } else {
        menu.style.bottom = 'auto';
        menu.style.top = `${Math.round(triggerRect.bottom + 6)}px`;
    }
}

function clearCustomSelectMenuPosition(menu) {
    if (!menu) return;
    menu.style.position = '';
    menu.style.left = '';
    menu.style.right = '';
    menu.style.top = '';
    menu.style.bottom = '';
    menu.style.width = '';
    menu.style.zIndex = '';
    menu.style.maxHeight = '';
    menu.classList.remove('is-drop-up');
}

function closeCustomSelect(host) {
    if (!host) return;
    host.classList.remove('is-open', 'is-drop-up');
    const trigger = host.querySelector('.custom-select-trigger');
    const menu = host._customSelectMenu || host.querySelector('.custom-select-menu');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (menu) {
        menu.hidden = true;
        clearCustomSelectMenuPosition(menu);
        if (menu.parentElement !== host) {
            host.appendChild(menu);
        }
    }
}

function closeAllCustomSelects(exceptHost = null) {
    document.querySelectorAll('.custom-select.is-open').forEach((host) => {
        if (host !== exceptHost) closeCustomSelect(host);
    });
}

function enhanceSelect(select) {
    if (!select || select.dataset.customized === '1') return;
    select.dataset.customized = '1';

    const host =
        select.closest('[data-custom-select], .sort-wrapper, .form-group') ||
        select.parentElement;
    if (!host) return;

    host.classList.add('custom-select');
    select.classList.add('custom-select-native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const ariaLabel = select.getAttribute('aria-label');
    if (ariaLabel) trigger.setAttribute('aria-label', ariaLabel);
    if (select.id) {
        trigger.id = `${select.id}-trigger`;
        const label = document.querySelector(`label[for="${select.id}"]`);
        if (label) label.setAttribute('for', trigger.id);
    }

    const menu = document.createElement('ul');
    menu.className = 'custom-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    if (ariaLabel) menu.setAttribute('aria-label', ariaLabel);

    const syncFromSelect = () => {
        const selected = select.options[select.selectedIndex];
        trigger.textContent = selected ? selected.textContent : '';
        [...menu.children].forEach((li) => {
            li.setAttribute(
                'aria-selected',
                String(li.dataset.value === select.value)
            );
            li.classList.toggle('is-selected', li.dataset.value === select.value);
        });
    };

    [...select.options].forEach((opt) => {
        const li = document.createElement('li');
        li.className = 'custom-select-option';
        li.setAttribute('role', 'option');
        li.dataset.value = opt.value;
        li.textContent = opt.textContent;
        li.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (select.value !== opt.value) {
                select.value = opt.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
            syncFromSelect();
            closeCustomSelect(host);
            trigger.focus();
        });
        menu.appendChild(li);
    });

    syncFromSelect();
    host.appendChild(trigger);
    host.appendChild(menu);
    host._customSelectMenu = menu;
    menu.dataset.customSelectHost = select.id || `select-${Math.random().toString(36).slice(2, 8)}`;

    const open = () => {
        closeAllCustomSelects(host);
        host.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        positionCustomSelectMenu(host);
        const selected = menu.querySelector('[aria-selected="true"]');
        (selected || menu.firstElementChild)?.focus?.();
    };

    trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (host.classList.contains('is-open')) {
            closeCustomSelect(host);
        } else {
            open();
        }
    });

    trigger.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!host.classList.contains('is-open')) open();
        }
    });

    select.addEventListener('change', syncFromSelect);
}

function initCustomSelects() {
    document
        .querySelectorAll('select.sort-select, #product-type')
        .forEach(enhanceSelect);

    if (document.documentElement.dataset.customSelectBound === '1') return;
    document.documentElement.dataset.customSelectBound = '1';

    document.addEventListener('click', (event) => {
        if (
            !event.target.closest('.custom-select') &&
            !event.target.closest('.custom-select-menu')
        ) {
            closeAllCustomSelects();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeAllCustomSelects();
    });

    window.addEventListener(
        'resize',
        () => {
            document.querySelectorAll('.custom-select.is-open').forEach(positionCustomSelectMenu);
        },
        { passive: true }
    );

    window.addEventListener(
        'scroll',
        () => closeAllCustomSelects(),
        { passive: true, capture: true }
    );
}

window.initCustomSelects = initCustomSelects;

function createProductCard(product) {
    const badge = product.isNew ? '<div class="product-badge badge-new">NEW</div>' : 
                  product.isBestseller ? '<div class="product-badge bestseller">BESTSELLER</div>' : '';
    
    const priceHTML = product.originalPrice ? 
        `<p class="product-price">
            <span class="product-price-original">${formatPrice(product.originalPrice)}</span>
            ${formatPrice(product.price)}
        </p>` :
        `<p class="product-price">${formatPrice(product.price)}</p>`;

    const favActive = isFavorite(product.id) ? ' is-active' : '';
    
    return `
        <article class="product-card" data-product-id="${product.id}">
            <div class="product-image-wrapper">
                <a href="product.html?id=${product.id}" class="product-image-link" aria-label="${product.name}">
                    <img src="${product.image}" alt="${product.name}" loading="lazy" width="600" height="800">
                </a>
                <div class="product-overlay">
                    <button class="btn-glass btn-glass--sm quick-view-btn" onclick="openQuickViewModal(${product.id})" type="button" aria-label="Быстрый просмотр: ${product.name}">Быстрый просмотр</button>
                    <a class="btn-glass btn-glass--sm product-card-link" href="product.html?id=${product.id}">Подробнее</a>
                </div>
                <button type="button" class="favorite-btn${favActive}" data-favorite-id="${product.id}" onclick="toggleFavorite(${product.id}, this, event)" aria-label="В избранное" aria-pressed="${isFavorite(product.id)}">
                    <i class="fa-${isFavorite(product.id) ? 'solid' : 'regular'} fa-heart" aria-hidden="true"></i>
                </button>
                ${badge}
            </div>
            <h3 class="product-name"><a href="product.html?id=${product.id}">${product.name}</a></h3>
            <p class="product-desc">${product.description}</p>
            ${priceHTML}
        </article>
    `;
}

function renderFeaturedProducts() {
    const grid = document.getElementById('featured-products-grid');
    if (!grid) return;
    grid.innerHTML = getFeaturedProducts(8).map((p) => createProductCard(p)).join('');
    initProductCarousels();
    initTouchProductOverlays();
}

// Функция рендеринга товаров с пагинацией
function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    const emptyState = document.getElementById('empty-state');
    const pagination = document.getElementById('pagination');
    
    if (!grid) return;
    
    if (products.length === 0) {
        grid.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        if (pagination) {
            pagination.style.display = 'none';
        }
        initProductCarousels();
        initTouchProductOverlays();
    } else {
        grid.style.display = 'grid';
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Вычисляем общее количество страниц
        const totalPages = Math.ceil(products.length / itemsPerPage);
        
        // Сбрасываем на первую страницу, если текущая страница больше общего количества
        if (currentPage > totalPages) {
            currentPage = 1;
        }
        
        // Вычисляем индексы для текущей страницы
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const productsToShow = products.slice(startIndex, endIndex);
        
        // Рендерим товары текущей страницы
        grid.innerHTML = productsToShow.map(product => createProductCard(product)).join('');
        
        // Рендерим пагинацию, если товаров больше чем на одной странице
        if (totalPages > 1) {
            renderPagination(totalPages);
            if (pagination) {
                pagination.style.display = 'flex';
            }
        } else {
            if (pagination) {
                pagination.style.display = 'none';
            }
        }
        initProductCarousels();
        initTouchProductOverlays();
    }
}

/** Touch: show card overlay when product sits in the mid viewport band */
let touchOverlayObserver = null;
let touchOverlayMediaBound = false;

function isTouchProductOverlayMode() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

function isMobileProductCarouselMode() {
    return window.matchMedia('(max-width: 767px)').matches;
}

function setCarouselActiveCard(grid, activeCard) {
    grid.querySelectorAll('.product-card.is-mid-viewport').forEach((card) => {
        if (card !== activeCard) card.classList.remove('is-mid-viewport');
    });
    if (activeCard) activeCard.classList.add('is-mid-viewport');
}

function getNearestSnapCard(grid) {
    const cards = [...grid.querySelectorAll('.product-card')];
    if (!cards.length) return null;
    const mid = grid.scrollLeft + grid.clientWidth / 2;
    let best = cards[0];
    let bestDist = Infinity;
    cards.forEach((card) => {
        const center = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
            bestDist = dist;
            best = card;
        }
    });
    return best;
}

function syncCarouselChrome(grid, wrap) {
    const cards = [...grid.querySelectorAll('.product-card')];
    const active = getNearestSnapCard(grid);
    const index = Math.max(0, cards.indexOf(active));

    if (isTouchProductOverlayMode()) {
        const rect = grid.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const inMidBand = rect.top < vh * 0.66 && rect.bottom > vh * 0.34;
        setCarouselActiveCard(grid, inMidBand ? active : null);
    }

    const dots = wrap?.querySelectorAll('.product-carousel-dot');
    if (dots?.length) {
        dots.forEach((dot, i) => {
            dot.setAttribute('aria-current', i === index ? 'true' : 'false');
        });
    }

    if (wrap) {
        const maxScroll = grid.scrollWidth - grid.clientWidth - 4;
        wrap.classList.toggle('is-at-end', grid.scrollLeft >= maxScroll);
        wrap.classList.toggle('is-at-start', grid.scrollLeft <= 4);
    }
}

function ensureCarouselWrapper(grid) {
    if (grid.parentElement?.classList.contains('product-carousel')) {
        return grid.parentElement;
    }
    const wrap = document.createElement('div');
    wrap.className = 'product-carousel';
    grid.parentNode.insertBefore(wrap, grid);
    wrap.appendChild(grid);
    return wrap;
}

function renderCarouselDots(wrap, grid) {
    const cards = grid.querySelectorAll('.product-card');
    let dots = wrap.querySelector('.product-carousel-dots');
    if (!dots) {
        dots = document.createElement('div');
        dots.className = 'product-carousel-dots';
        dots.setAttribute('role', 'tablist');
        dots.setAttribute('aria-label', 'Навигация по карточкам');
        wrap.appendChild(dots);
    }
    dots.innerHTML = '';
    cards.forEach((card, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'product-carousel-dot';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-label', `Карточка ${i + 1} из ${cards.length}`);
        btn.setAttribute('aria-current', i === 0 ? 'true' : 'false');
        btn.addEventListener('click', () => {
            card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
        dots.appendChild(btn);
    });
}

function teardownCarousel(grid) {
    grid.classList.remove('product-grid--carousel');
    grid.removeAttribute('tabindex');
    grid.removeAttribute('role');
    grid.removeAttribute('aria-label');
    if (grid._carouselOnScroll) {
        grid.removeEventListener('scroll', grid._carouselOnScroll);
        grid._carouselOnScroll = null;
    }
    const wrap = grid.parentElement;
    if (wrap?.classList.contains('product-carousel')) {
        const dots = wrap.querySelector('.product-carousel-dots');
        if (dots) dots.remove();
        wrap.classList.remove('is-at-end', 'is-at-start');
        wrap.parentNode.insertBefore(grid, wrap);
        wrap.remove();
    }
}

function initProductCarousels() {
    const mobile = isMobileProductCarouselMode();

    document.querySelectorAll('.product-grid').forEach((grid) => {
        // Catalog stays a 2-up commerce grid — never a swipe carousel
        if (grid.id === 'products-grid' || grid.closest('.catalog-page')) {
            teardownCarousel(grid);
            return;
        }

        const cards = grid.querySelectorAll('.product-card');
        const shouldCarousel = mobile && cards.length >= 3;

        if (!shouldCarousel) {
            teardownCarousel(grid);
            return;
        }

        const wrap = ensureCarouselWrapper(grid);
        grid.classList.add('product-grid--carousel');
        grid.setAttribute('tabindex', '0');
        grid.setAttribute('role', 'region');
        grid.setAttribute('aria-label', 'Карусель товаров, свайпните влево или вправо');
        renderCarouselDots(wrap, grid);

        if (grid._carouselOnScroll) {
            grid.removeEventListener('scroll', grid._carouselOnScroll);
        }
        let ticking = false;
        grid._carouselOnScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                syncCarouselChrome(grid, wrap);
                ticking = false;
            });
        };
        grid.addEventListener('scroll', grid._carouselOnScroll, { passive: true });
        syncCarouselChrome(grid, wrap);
    });
}

let productCarouselMediaBound = false;

function bindProductCarouselMedia() {
    if (productCarouselMediaBound) return;
    productCarouselMediaBound = true;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => {
        initProductCarousels();
        initTouchProductOverlays();
    };
    if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', onChange);
    } else if (typeof mq.addListener === 'function') {
        mq.addListener(onChange);
    }

    let scrollTick = false;
    window.addEventListener(
        'scroll',
        () => {
            if (scrollTick || !isMobileProductCarouselMode()) return;
            scrollTick = true;
            requestAnimationFrame(() => {
                document.querySelectorAll('.product-grid--carousel').forEach((grid) => {
                    const wrap = grid.parentElement?.classList.contains('product-carousel')
                        ? grid.parentElement
                        : null;
                    syncCarouselChrome(grid, wrap);
                });
                scrollTick = false;
            });
        },
        { passive: true }
    );
}

function initTouchProductOverlays() {
    if (touchOverlayObserver) {
        touchOverlayObserver.disconnect();
        touchOverlayObserver = null;
    }

    document.querySelectorAll('.product-card.is-mid-viewport').forEach((card) => {
        card.classList.remove('is-mid-viewport');
    });

    if (!isTouchProductOverlayMode()) return;

    // Carousel cards: overlay follows snap-centered slide (handled in syncCarouselChrome)
    const carouselCards = new Set(
        [...document.querySelectorAll('.product-grid--carousel .product-card')]
    );

    touchOverlayObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (carouselCards.has(entry.target)) return;
                entry.target.classList.toggle('is-mid-viewport', entry.isIntersecting);
            });
        },
        {
            root: null,
            rootMargin: '-44% 0px -44% 0px',
            threshold: 0
        }
    );

    document.querySelectorAll('.product-card').forEach((card) => {
        if (carouselCards.has(card)) return;
        touchOverlayObserver.observe(card);
    });

    document.querySelectorAll('.product-grid--carousel').forEach((grid) => {
        const wrap = grid.parentElement?.classList.contains('product-carousel')
            ? grid.parentElement
            : null;
        syncCarouselChrome(grid, wrap);
    });

    if (!touchOverlayMediaBound) {
        touchOverlayMediaBound = true;
        const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
        const onChange = () => initTouchProductOverlays();
        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', onChange);
        } else if (typeof mq.addListener === 'function') {
            mq.addListener(onChange);
        }
    }
}

window.initTouchProductOverlays = initTouchProductOverlays;
window.initProductCarousels = initProductCarousels;

// Функция обновления счетчика товаров
function updateProductCount(count) {
    const countEl = document.getElementById('products-count');
    if (countEl) {
        const mod10 = count % 10;
        const mod100 = count % 100;
        let word = 'товаров';
        if (mod10 === 1 && mod100 !== 11) {
            word = 'товар';
        } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
            word = 'товара';
        }
        countEl.textContent = `${count} ${word}`;
    }
}

/** Читает ?type=&category=&size= из URL и применяет к каталогу */
function applyFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const types = params.getAll('type').flatMap(v => v.split(',')).filter(Boolean);
    const categories = params.getAll('category').flatMap(v => v.split(',')).filter(Boolean);
    const sizes = params.getAll('size').flatMap(v => v.split(',')).filter(Boolean);
    const favoritesOnly = params.get('favorites') === '1';

    if (favoritesOnly) {
        const ids = getFavorites();
        filteredProducts = catalogProducts.filter((p) => ids.includes(p.id));
        currentPage = 1;
        renderProducts(filteredProducts);
        updateProductCount(filteredProducts.length);
        const title = document.querySelector('#catalog-page .section-title');
        if (title) title.textContent = 'Избранное';
        return true;
    }

    if (!types.length && !categories.length && !sizes.length) {
        return false;
    }

    activeFilters = { type: types, category: categories, size: sizes };
    restoreFilterState();
    applyFiltersToProducts();
    return true;
}

/** Синхронизирует активные фильтры в query string (без перезагрузки) */
function syncFiltersToURL() {
    if (!document.getElementById('catalog-page')) return;

    const params = new URLSearchParams();
    activeFilters.type.forEach(t => params.append('type', t));
    activeFilters.category.forEach(c => params.append('category', c));
    activeFilters.size.forEach(s => params.append('size', s));

    const query = params.toString();
    const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', next);
}

// Функция перехода на страницу
function goToPage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    
    if (page < 1 || page > totalPages) {
        return;
    }
    
    currentPage = page;
    
    // Напрямую рендерим товары без сброса страницы
    renderProducts(filteredProducts);
    
    // Stable jump to catalog top — no smooth scroll (avoids header thrash + layout jump)
    beginProgrammaticScroll(400);
    const catalogSection = document.getElementById('catalog-page');
    if (catalogSection) {
        const headerHeight = document.getElementById('header')?.offsetHeight || 0;
        const sectionTop = catalogSection.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({ top: Math.max(0, sectionTop), behavior: 'auto' });
    } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }
}

// Функция рендеринга пагинации
function renderPagination(totalPages) {
    const paginationPages = document.getElementById('pagination-pages');
    const prevBtn = document.getElementById('pagination-prev');
    const nextBtn = document.getElementById('pagination-next');
    
    if (!paginationPages) return;
    
    // Обновляем состояние кнопок "Назад" и "Вперед"
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
    
    // Генерируем кнопки страниц
    let paginationHTML = '';
    
    // Всегда показываем первую страницу
    if (totalPages <= 7) {
        // Если страниц 7 или меньше, показываем все
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <button onclick="goToPage(${i})" class="pagination-btn pagination-btn-page ${i === currentPage ? 'active' : ''}" aria-label="Страница ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>
                    ${i}
                </button>
            `;
        }
    } else {
        // Если страниц больше 7, показываем с многоточием
        if (currentPage <= 3) {
            // Показываем первые 3 страницы, многоточие, последние 2
            for (let i = 1; i <= 3; i++) {
                paginationHTML += `
                    <button onclick="goToPage(${i})" class="pagination-btn pagination-btn-page ${i === currentPage ? 'active' : ''}" aria-label="Страница ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>
                        ${i}
                    </button>
                `;
            }
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
            for (let i = totalPages - 1; i <= totalPages; i++) {
                paginationHTML += `
                    <button onclick="goToPage(${i})" class="pagination-btn pagination-btn-page ${i === currentPage ? 'active' : ''}" aria-label="Страница ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>
                        ${i}
                    </button>
                `;
            }
        } else if (currentPage >= totalPages - 2) {
            // Показываем первые 2 страницы, многоточие, последние 3
            for (let i = 1; i <= 2; i++) {
                paginationHTML += `
                    <button onclick="goToPage(${i})" class="pagination-btn pagination-btn-page ${i === currentPage ? 'active' : ''}" aria-label="Страница ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>
                        ${i}
                    </button>
                `;
            }
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
            for (let i = totalPages - 2; i <= totalPages; i++) {
                paginationHTML += `
                    <button onclick="goToPage(${i})" class="pagination-btn pagination-btn-page ${i === currentPage ? 'active' : ''}" aria-label="Страница ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>
                        ${i}
                    </button>
                `;
            }
        } else {
            // Показываем первую страницу, многоточие, текущую и соседние, многоточие, последнюю
            paginationHTML += `
                <button onclick="goToPage(1)" class="pagination-btn pagination-btn-page ${1 === currentPage ? 'active' : ''}" aria-label="Страница 1" ${1 === currentPage ? 'aria-current="page"' : ''}>
                    1
                </button>
            `;
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
            for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                paginationHTML += `
                    <button onclick="goToPage(${i})" class="pagination-btn pagination-btn-page ${i === currentPage ? 'active' : ''}" aria-label="Страница ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>
                        ${i}
                    </button>
                `;
            }
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
            paginationHTML += `
                <button onclick="goToPage(${totalPages})" class="pagination-btn pagination-btn-page ${totalPages === currentPage ? 'active' : ''}" aria-label="Страница ${totalPages}" ${totalPages === currentPage ? 'aria-current="page"' : ''}>
                    ${totalPages}
                </button>
            `;
        }
    }
    
    paginationPages.innerHTML = paginationHTML;
}

// Инициализация каталога
function initCatalog() {
    // Инициализируем счетчик фильтров
    updateFilterCount();
    
    // Сбрасываем на первую страницу
    currentPage = 1;
    
    // URL deep-links с лендинга (?type= / ?category=)
    const fromURL = applyFiltersFromURL();
    if (!fromURL) {
        // Сортировка по умолчанию (отобразит все товары)
        sortProducts('popularity');
    }
    
    // Обработчик ESC для закрытия модального окна (только один раз)
    if (!window.catalogEscHandlerAdded) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('filters-modal');
                if (modal && modal.classList.contains('active')) {
                    closeFiltersModal();
                }
            }
        });
        window.catalogEscHandlerAdded = true;
    }
    
    // Обработчик клика на overlay для закрытия модального окна
    const overlay = document.querySelector('.filters-modal-overlay');
    if (overlay && !overlay.hasAttribute('data-listener-added')) {
        overlay.addEventListener('click', closeFiltersModal);
        overlay.setAttribute('data-listener-added', 'true');
    }
}

// Функции модального окна уже определены выше перед DOMContentLoaded
// Дубликаты удалены для избежания конфликтов

// Экспортируем функции в window для доступа из HTML (onclick)
// Это нужно для работы с type="module" в Vite
window.openMenu = openMenu;
window.closeMenu = closeMenu;
window.toggleTheme = toggleTheme;
window.showNotification = showNotification;
window.hideNotification = hideNotification;
window.handleContactSubmit = handleContactSubmit;
window.initCartPage = initCartPage;
window.updateCartBadge = updateCartBadge;
window.updateCalculatorFields = updateCalculatorFields;
window.handleSizeCalculatorSubmit = handleSizeCalculatorSubmit;
window.openSizeGuideModal = openSizeGuideModal;
window.closeSizeGuideModal = closeSizeGuideModal;
window.openSizeCalculatorModal = openSizeCalculatorModal;
window.closeSizeCalculatorModal = closeSizeCalculatorModal;
window.openFiltersModal = openFiltersModal;
window.closeFiltersModal = closeFiltersModal;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.handleSortChange = handleSortChange;
window.goToPage = goToPage;
window.initCatalog = initCatalog;
window.goToPrevPage = goToPrevPage;
window.goToNextPage = goToNextPage;
window.updateFilterCount = updateFilterCount;
window.openQuickViewModal = openQuickViewModal;
window.openQuickViewModalWithData = openQuickViewModalWithData;
window.closeQuickViewModal = closeQuickViewModal;
window.openQuickViewFromCard = openQuickViewFromCard;
window.toggleFavorite = toggleFavorite;
window.handleCatalogSearch = handleCatalogSearch;
