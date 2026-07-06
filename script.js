/* ===== Pharmron — Complete Product & Cart Engine ===== */

/* ------------------------------------------------------------------ */
/*  Shipping Configuration                                               */
/* ------------------------------------------------------------------ */
const SHIPPING_OPTIONS = {
    'lagos': { name: 'Lagos State', fee: 0, description: 'Free shipping for 5+ products' },
    'other': { name: 'Other Nigerian States', fee: 5000, description: '₦5,000 shipping fee' }
};

function getShippingFee(cartItems, state) {
    const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);
    if (state === 'lagos' && totalItems >= 5) {
        return 0;
    }
    return state === 'lagos' ? 2000 : 5000;
}

function getShippingDescription(state, cartItems) {
    const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);
    if (state === 'lagos') {
        return totalItems >= 5 ? 'Free shipping (5+ products)' : '₦2,000 shipping fee';
    }
    return '₦5,000 shipping fee';
}

/* ------------------------------------------------------------------ */
/*  Environment Detection & Configuration                               */
/* ------------------------------------------------------------------ */
const IS_LOCALHOST = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.port === '3000' ||
                     window.location.hostname === '';

// Use .env values if available, otherwise fallback to production URLs
const PAYSTACK_PUBLIC_KEY = (IS_LOCALHOST ? 'pk_test_' : 'pk_live_') + 'e0b42fdbd927f638715ef3a1df3dbbd26a4b0ddf';
const LEAD_MAGNET_WEBHOOK_URL = API_BASE + '/api/lead-magnet';
const ORDER_WEBHOOK_URL = API_BASE + '/api/order';

/* ------------------------------------------------------------------ */
/*  Shared State                                                       */
/* ------------------------------------------------------------------ */
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('pharmron_cart') || '[]');
let couponCode = localStorage.getItem('pharmron_coupon') || '';

function saveCoupon() {
    localStorage.setItem('pharmron_coupon', couponCode);
}

function getDiscountAmount(subtotal) {
    return couponCode === 'PHARMRON10' ? Math.round(subtotal * 0.10) : 0;
}

function saveCart() {
    localStorage.setItem('pharmron_cart', JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (badge) {
        const count = cart.reduce((sum, item) => sum + item.qty, 0);
        badge.textContent = count;
    }
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */
function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ------------------------------------------------------------------ */
/*  CSV Parser                                                         */
/* ------------------------------------------------------------------ */
function parseCSVRows(text) {
    const rows = [];
    let currentRow = [], currentField = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i], nx = text[i + 1];
        if (inQuotes) {
            if (ch === '"' && nx === '"') { currentField += '"'; i++; }
            else if (ch === '"') inQuotes = false;
            else currentField += ch;
        } else {
            if (ch === '"') inQuotes = true;
            else if (ch === ',') { currentRow.push(currentField.trim()); currentField = ''; }
            else if (ch === '\n' && nx !== undefined) { currentRow.push(currentField.trim()); if (currentRow.length) rows.push(currentRow); currentRow = []; currentField = ''; }
            else if (ch === '\r') {}
            else currentField += ch;
        }
    }
    currentRow.push(currentField.trim());
    if (currentRow.length) rows.push(currentRow);
    return rows;
}

function fixImagePath(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    path = path.replace(/\.pmg$/i, '.png');
    path = path.replace('Turmeric-capsules', 'Turmeric-capsule');
    if (!path.startsWith('images/')) path = 'images/' + path;
    // URL-encode spaces in the path for safe HTML src usage
    let parts = path.split('/');
    parts[parts.length - 1] = encodeURIComponent(parts[parts.length - 1]);
    return parts.join('/');
}

function normalizeHeader(h) {
    return h.trim().replace(/^"|"$/g, '').replace(/\s+/g, ' ');
}

/* ------------------------------------------------------------------ */
/*  Fetch Products                                                     */
/* ------------------------------------------------------------------ */
async function fetchProducts() {
    console.log('Fetching products...');
    const response = await fetch('products.csv');
    const csvText = await response.text();
    const rows = parseCSVRows(csvText);
    if (rows.length < 2) {
        console.log('No products found in CSV or CSV too short.');
        return [];
    }

    const headers = rows[0].map(normalizeHeader);
    const products = [];

    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        const raw = {};
        headers.forEach((h, idx) => { raw[h] = (values[idx] || '').trim(); });

        const cat = (raw['Category'] || raw['Category '] || '').trim();

        products.push({
            id: raw['Product ID'] || `prod-${i}`,
            name: raw['Name'] || '',
            category: cat,
            price: raw['Price'] || '',
            priceNum: parseFloat((raw['Price'] || '').replace(/[^0-9.]/g, '')) || 0,
            gtin: (raw['GTIN'] || '').replace(/`/g, ''),
            imagePath: fixImagePath(raw['image_url'] || ''),
            paystackLink: raw['Paystack _url'] || raw['Paystack_url'] || '',
            whatsappMessage: raw['Whatapp_text'] || raw['Whatsapp_text'] || '',
            problem: raw['Problem'] || raw['Problem '] || '',
            solution: raw['Solution'] || raw['Solution '] || '',
            type: cat.toLowerCase().includes('signature') ? 'Signature' : 'Partner'
        });
    }

    console.log('Fetched products:', products.length);
    return products;
}

/* ------------------------------------------------------------------ */
/*  Add to Cart                                                        */
/* ------------------------------------------------------------------ */
function addToCart(productId) {
    const p = allProducts.find(x => x.id === productId);
    if (!p) return;
    const existing = cart.find(x => x.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ id: productId, qty: 1 });
    }
    saveCart();
    showToast(`🛒 Added "${p.name}" to cart`);
}

/* ------------------------------------------------------------------ */
/*  Render Product Card (for grid)                                     */
/* ------------------------------------------------------------------ */
function renderProductCard(product, allProds) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    card.dataset.category = product.category;
    card.dataset.productId = product.id;

    const orderMsg = encodeURIComponent(product.whatsappMessage || `I will like to get ${product.name}`);

    card.innerHTML = `
        <a href="product.html?id=${encodeURIComponent(product.id)}" class="block">
            <div class="product-image-wrap rounded-t-xl">
                <img src="${product.imagePath}" alt="${product.name}" loading="lazy" onerror="this.src='images/placeholder.png'">
                <span class="product-type-badge ${product.type === 'Signature' ? 'badge-signature' : 'badge-partner'}">${product.type}</span>
            </div>
        </a>
        <div class="p-4 sm:p-5">
            <div class="mb-2 flex items-center justify-between gap-2">
                <span class="category-badge truncate max-w-[140px]">${product.category}</span>
                <span class="text-xs font-mono text-obsidian-500">${product.gtin ? '✓ ' + product.gtin.slice(-4) : ''}</span>
            </div>
            <a href="product.html?id=${encodeURIComponent(product.id)}">
                <h3 class="text-base font-semibold leading-snug text-white transition hover:text-gold sm:text-lg">${product.name}</h3>
            </a>
            <p class="price-tag mt-1.5 text-lg">${product.price}</p>
            <div class="product-actions">
                <a href="product.html?id=${encodeURIComponent(product.id)}" class="product-action-btn action-details">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
                    Details
                </a>
                <a href="https://wa.me/2348037341221?text=${orderMsg}" target="_blank" rel="noopener" class="product-action-btn action-whatsapp">
                    <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                </a>
                <button class="product-action-btn action-cart add-cart-btn" data-id="${product.id}">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                    Add to Cart
                </button>
            </div>
        </div>
    `;

    card.querySelector('.add-cart-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(product.id);
    });

    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
        if (!e.target.closest('a') && !e.target.closest('button')) {
            window.location.href = `product.html?id=${encodeURIComponent(product.id)}`;
        }
    });

    return card;
}

/* ------------------------------------------------------------------ */
/*  Staggered Entrance Animation                                       */
/* ------------------------------------------------------------------ */
function observeCards(container) {
    const cards = container.querySelectorAll('.product-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const delay = Array.from(cards).indexOf(entry.target) * 0.06;
                entry.target.style.transition = `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`;
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px 40px 0px' });
    cards.forEach(c => observer.observe(c));
}

/* ------------------------------------------------------------------ */
/*  Filtering                                                          */
/* ------------------------------------------------------------------ */
function filterProducts(products, category) {
    return category === 'all' ? products : products.filter(p => p.category === category);
}

function renderGrid(products, allProds) {
    console.log('Rendering grid with products:', products.length);
    const grid = document.getElementById('product-grid');
    if (!grid) {
        console.log('Product grid element not found.');
        return;
    }
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    products.forEach(p => fragment.appendChild(renderProductCard(p, allProds)));
    grid.appendChild(fragment);
    observeCards(grid);
}

/* ------------------------------------------------------------------ */
/*  Init — Home Page                                                   */
/* ------------------------------------------------------------------ */
function initHomePage(products) {
    console.log('Initializing home page with products:', products.length);
    const filterContainer = document.getElementById('filter-container');
    const grid = document.getElementById('product-grid');
    if (!filterContainer || !grid) {
        console.log('Filter container or product grid element not found.');
        return;
    }

    const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.dataset.category = cat;
        btn.textContent = cat;
        btn.className = 'rounded-lg px-5 py-2.5 text-sm font-semibold transition';
        btn.setAttribute('role', 'tab');
        filterContainer.appendChild(btn);
    });

    renderGrid(products, products);

    filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const cat = btn.dataset.category;
        filterContainer.querySelectorAll('button').forEach(b => b.classList.remove('active-filter'));
        btn.classList.add('active-filter');
        renderGrid(filterProducts(products, cat), products);
    });

    const allBtn = filterContainer.querySelector('[data-category="all"]');
    if (allBtn) allBtn.classList.add('active-filter');
}

function initLeadMagnet() {
    const section = document.getElementById('lead-magnet-section');
    if (!section) return;

    const form = section.querySelector('form');
    const successMessage = section.querySelector('#lead-magnet-success');
    const couponDisplay = section.querySelector('#coupon-display');
    const couponModal = document.getElementById('coupon-modal');
    const closeModalBtn = document.getElementById('close-coupon-modal');
    const copyCouponBtn = document.getElementById('copy-coupon-btn');

    if (!form || !successMessage || !couponDisplay || !couponModal || !closeModalBtn || !copyCouponBtn) return;

    // Initialize Framer Motion animations
    const { motion, AnimatePresence } = window.framerMotion || {};

    if (motion) {
        // Animate the modal
        motion.div({
            initial: { opacity: 0, scale: 0.95 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.95 },
            transition: { duration: 0.3 }
        });

        // Animate the coupon code display
        motion.div({
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 0.2, duration: 0.4 }
        });
    }

    // Close modal function
    const closeModal = () => {
        couponModal.classList.add('hidden');
        document.body.style.overflow = '';
    };

    // Open modal function
    const openModal = () => {
        couponModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    // Close modal when clicking the close button
    closeModalBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside the modal content
    couponModal.addEventListener('click', (e) => {
        if (e.target === couponModal) {
            closeModal();
        }
    });

    // Copy coupon code to clipboard
    copyCouponBtn.addEventListener('click', () => {
        navigator.clipboard.writeText('PHARMRON10').then(() => {
            showToast('Coupon code copied to clipboard!');
            closeModal();
        }).catch(err => {
            console.error('Failed to copy: ', err);
            showToast('Failed to copy code. Please try again.');
        });
    });

    // Handle form submission
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = (form.elements['email']?.value || '').trim();
        if (!email) return;

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        if (LEAD_MAGNET_WEBHOOK_URL) {
            try {
                await fetch(LEAD_MAGNET_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, timestamp: new Date().toISOString() })
                });
            } catch (error) {
                console.warn('Lead magnet webhook failed', error);
            }
        }

        form.style.display = 'none';
        successMessage.style.display = 'block';
        couponDisplay.style.display = 'block';
        couponDisplay.classList.add('animate-modal-in');

        // Save coupon to localStorage
        localStorage.setItem('pharmron_coupon', 'PHARMRON10');

        // Show the coupon modal with animation
        setTimeout(() => {
            openModal();
        }, 300);
    });
}

/* ------------------------------------------------------------------ */
/*  Init — Product Detail Page                                         */
/* ------------------------------------------------------------------ */
function initProductPage(products) {
    const container = document.getElementById('product-detail');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = products.find(p => p.id === id) || products[0];

    if (!product) {
        container.innerHTML = `<div class="col-span-full text-center py-20"><p class="text-obsidian-400">Product not found.</p></div>`;
        return;
    }

    const orderMsg = encodeURIComponent(product.whatsappMessage || `I will like to get ${product.name}`);

    container.innerHTML = `
        <div class="lg:flex lg:gap-16">
            <!-- Image -->
            <div class="mb-8 lg:mb-0 lg:w-1/2">
                <div class="product-detail-image-wrap">
                    <img src="${product.imagePath}" alt="${product.name}" class="w-full object-cover" style="aspect-ratio:1/1" onerror="this.src='images/placeholder.png'">
                </div>
            </div>
            <!-- Info -->
            <div class="lg:w-1/2">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="category-badge">${product.category}</span>
                    <span class="product-type-badge ${product.type === 'Signature' ? 'badge-signature' : 'badge-partner'}">${product.type}</span>
                </div>
                <h1 class="mt-4 text-3xl font-black text-white sm:text-4xl lg:text-5xl">${product.name}</h1>
                <p class="price-tag mt-3 text-3xl">${product.price}</p>

                <!-- GTIN Badge -->
                ${product.gtin ? `
                <div class="mt-4 inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2">
                    <svg class="h-5 w-5 text-gold" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span class="text-sm font-medium text-gold">GTIN: <span class="font-mono">${product.gtin}</span></span>
                </div>
                ` : ''}

                <!-- Problem -->
                ${product.problem ? `
                <div class="mt-8">
                    <h4 class="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-obsidian-500">The Problem</h4>
                    <p class="leading-relaxed text-obsidian-300">${product.problem}</p>
                </div>
                ` : ''}

                <!-- Solution -->
                ${product.solution ? `
                <div class="mt-6">
                    <h4 class="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-obsidian-500">The Solution</h4>
                    <p class="leading-relaxed text-obsidian-300">${product.solution}</p>
                </div>
                ` : ''}

                <!-- Checkout Section -->
                <div class="mt-10 rounded-xl border border-gold/20 bg-obsidian-900 p-6">
                    <h3 class="text-lg font-bold text-white">Checkout Options</h3>

                    <!-- Email Input -->
                    <div class="mt-4">
                        <label for="checkout-email" class="mb-2 block text-sm font-medium text-obsidian-300">Email Address</label>
                        <input id="checkout-email" type="email" required class="w-full rounded-lg border border-obsidian-700 bg-obsidian-950 px-4 py-2.5 text-sm text-white focus:border-gold focus:ring-2 focus:ring-gold/20" placeholder="your@email.com">
                    </div>

                    <!-- Phone Input -->
                    <div class="mt-4">
                        <label for="checkout-phone" class="mb-2 block text-sm font-medium text-obsidian-300">Phone Number</label>
                        <input id="checkout-phone" type="tel" required class="w-full rounded-lg border border-obsidian-700 bg-obsidian-950 px-4 py-2.5 text-sm text-white focus:border-gold focus:ring-2 focus:ring-gold/20" placeholder="e.g. 08012345678" pattern="[0-9]{10,15}">
                        <p id="phone-requirement" class="mt-1 text-xs text-obsidian-400">We need your phone number for order confirmation and delivery updates.</p>
                    </div>

                    <!-- Shipping Address Input -->
                    <div class="mt-4">
                        <label for="checkout-address" class="mb-2 block text-sm font-medium text-obsidian-300">Shipping Address</label>
                        <textarea id="checkout-address" required class="w-full rounded-lg border border-obsidian-700 bg-obsidian-950 px-4 py-2.5 text-sm text-white focus:border-gold focus:ring-2 focus:ring-gold/20" placeholder="Enter your full delivery address (street, city, state)" rows="2"></textarea>
                        <p class="mt-1 text-xs text-obsidian-400">We need your address to deliver your order.</p>
                    </div>

                    <!-- Shipping Select -->
                    <div class="mt-4">
                        <label for="shipping-state" class="mb-2 block text-sm font-medium text-obsidian-300">Shipping Location</label>
                        <select id="shipping-state" class="w-full rounded-lg border border-obsidian-700 bg-obsidian-950 px-4 py-2.5 text-sm text-white focus:border-gold focus:ring-2 focus:ring-gold/20">
                            <option value="lagos">Lagos State</option>
                            <option value="other">Other Nigerian States</option>
                        </select>
                        <p id="shipping-description" class="mt-2 text-xs text-obsidian-400">Free shipping for 5+ products in Lagos</p>
                    </div>

                    <!-- Total Display -->
                    <div class="mt-6 flex items-center justify-between border-t border-obsidian-700 pt-4">
                        <span class="text-sm font-medium text-obsidian-300">Total</span>
                        <span id="product-total" class="text-xl font-bold text-gold">₦${product.priceNum.toLocaleString()}</span>
                    </div>

                    <!-- Actions -->
                    <div class="mt-6 flex flex-wrap gap-3">
                        <button id="detail-add-cart" class="flex-1 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-obsidian-950 shadow-lg shadow-gold/25 transition hover:bg-gold-light active:scale-[0.97]">
                            Add to Cart
                        </button>
                        <button id="pay-with-card" class="flex-1 rounded-xl border border-gold/30 bg-obsidian-900 px-5 py-3 text-sm font-bold text-gold shadow-sm transition hover:bg-obsidian-800 active:scale-[0.97]">
                            Pay with Card
                        </button>
                        <a href="https://wa.me/2348037341221?text=${orderMsg}" target="_blank" rel="noopener" class="flex-1 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-5 py-3 text-center text-sm font-bold text-emerald-300 transition hover:bg-emerald-900/50 active:scale-[0.97]">
                            Order on WhatsApp
                        </a>
                    </div>
                </div>

                <div class="mt-8">
                    <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-obsidian-500">Share this product</h3>
                    <div class="mt-3 flex flex-wrap gap-3">
                        <a id="share-facebook" href="#" target="_blank" rel="noopener" class="inline-flex items-center gap-2 rounded-xl border border-gold/20 bg-obsidian-900 px-5 py-3 text-sm font-semibold text-obsidian-100 transition hover:border-gold/40 hover:text-gold">Facebook</a>
                        <a id="share-twitter" href="#" target="_blank" rel="noopener" class="inline-flex items-center gap-2 rounded-xl border border-gold/20 bg-obsidian-900 px-5 py-3 text-sm font-semibold text-obsidian-100 transition hover:border-gold/40 hover:text-gold">Twitter</a>
                        <a id="share-whatsapp" href="#" target="_blank" rel="noopener" class="inline-flex items-center gap-2 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-900/50 hover:text-emerald-100">WhatsApp</a>
                    </div>
                </div>

                <div class="mt-8">
                    <a href="/#products" class="inline-flex items-center gap-1.5 text-sm text-obsidian-500 transition hover:text-gold">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"/></svg>
                        Back to Products
                    </a>
                </div>

            </div>
        </div>
    `;

    const pageUrl = encodeURIComponent(window.location.href);
    const shareHeadline = encodeURIComponent(`Check out ${product.name} from Pharmron Natriceuticals`);
    const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
    const twitterShare = `https://twitter.com/intent/tweet?text=${shareHeadline}&url=${pageUrl}`;
    const whatsappShare = `https://wa.me/?text=${shareHeadline}%0A${pageUrl}`;

    const fbLink = document.getElementById('share-facebook');
    const twLink = document.getElementById('share-twitter');
    const waLink = document.getElementById('share-whatsapp');
    if (fbLink) fbLink.href = facebookShare;
    if (twLink) twLink.href = twitterShare;
    if (waLink) waLink.href = whatsappShare;

    // Add event listeners
    document.getElementById('detail-add-cart').addEventListener('click', () => addToCart(product.id));

    // Shipping state change handler
    const shippingSelect = document.getElementById('shipping-state');
    const shippingDesc = document.getElementById('shipping-description');
    const totalDisplay = document.getElementById('product-total');

    function updateShippingDisplay() {
        const state = shippingSelect.value;
        const shippingFee = getShippingFee([{id: product.id, qty: 1}], state);
        const total = calculateTotalWithShipping(product.price, `₦${shippingFee.toLocaleString()}`);

        totalDisplay.textContent = `₦${total.toLocaleString()}`;
        shippingDesc.textContent = getShippingDescription(state, [{id: product.id, qty: 1}]);
    }

    if (shippingSelect) {
        shippingSelect.addEventListener('change', updateShippingDisplay);
        updateShippingDisplay(); // Initialize
    }

    // Pay with card handler
    const payButton = document.getElementById('pay-with-card');
    const emailInput = document.getElementById('checkout-email');
    const phoneInput = document.getElementById('checkout-phone');
    const addressInput = document.getElementById('checkout-address');

    if (payButton && emailInput && phoneInput && addressInput) {
        payButton.addEventListener('click', () => {
            const email = emailInput.value.trim();
            const phoneNumber = phoneInput.value.trim();
            const address = addressInput.value.trim();
            
            if (!email) {
                showToast('Please enter your email address');
                return;
            }

            if (!phoneNumber || phoneNumber.length < 10) {
                showToast('Please enter a valid phone number (10-15 digits)');
                return;
            }

            if (!address) {
                showToast('Please enter your shipping address');
                return;
            }

            const state = shippingSelect.value;
            const shippingFee = getShippingFee([{id: product.id, qty: 1}], state);
            const total = calculateTotalWithShipping(product.price, `₦${shippingFee.toLocaleString()}`);

            const metadata = {
                custom_fields: [
                    {
                        display_name: 'Product',
                        variable_name: 'product',
                        value: product.name
                    },
                    {
                        display_name: 'Quantity',
                        variable_name: 'quantity',
                        value: '1'
                    },
                    {
                        display_name: 'Shipping',
                        variable_name: 'shipping',
                        value: state === 'lagos' ? 'Lagos' : 'Other States'
                    },
                    {
                        display_name: 'Phone',
                        variable_name: 'phone',
                        value: phoneNumber
                    },
                    {
                        display_name: 'Address',
                        variable_name: 'address',
                        value: address
                    }
                ]
            };

            initializePaystackPayment(email, total, metadata);
        });
    }
}

/* ------------------------------------------------------------------ */
/*  Init — Cart Page                                                   */
/* ------------------------------------------------------------------ */
function initCartPage(products) {
    const container = document.getElementById('cart-page');
    if (!container) return;

    function renderCart() {
        if (cart.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-center">
                    <svg class="mb-6 h-20 w-20 text-obsidian-600" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
                    <h2 class="mb-2 text-2xl font-bold text-white">Your cart is empty</h2>
                    <p class="mb-8 text-obsidian-400">Add some products to get started.</p>
                    <a href="/#products" class="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-obsidian-950 transition hover:bg-gold-light">Browse Products</a>
                </div>
            `;
            return;
        }

        let total = 0;
        let itemsHtml = '';

        cart.forEach((item, idx) => {
            const prod = allProducts.find(p => p.id === item.id);
            if (!prod) return;
            const subtotal = prod.priceNum * item.qty;
            total += subtotal;

            itemsHtml += `
                <div class="cart-item flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5" data-idx="${idx}">
                    <a href="product.html?id=${encodeURIComponent(prod.id)}" class="shrink-0">
                        <img src="${prod.imagePath}" alt="${prod.name}" class="h-20 w-20 rounded-lg object-cover sm:h-24 sm:w-24" onerror="this.src='images/placeholder.png'">
                    </a>
                    <div class="flex-1">
                        <a href="product.html?id=${encodeURIComponent(prod.id)}"><h3 class="font-semibold text-white transition hover:text-gold">${prod.name}</h3></a>
                        <p class="mt-0.5 text-sm text-obsidian-400">${prod.price} each</p>
                        ${prod.gtin ? `<p class="mt-0.5 text-xs text-obsidian-500">GTIN: ${prod.gtin}</p>` : ''}
                    </div>
                    <div class="flex items-center gap-3">
                        <button class="qty-down flex h-8 w-8 items-center justify-center rounded-lg border border-obsidian-700 bg-obsidian-800 text-obsidian-300 transition hover:border-gold/40 hover:text-gold" data-id="${prod.id}">−</button>
                        <input type="number" class="qty-input" value="${item.qty}" min="1" data-id="${prod.id}">
                        <button class="qty-up flex h-8 w-8 items-center justify-center rounded-lg border border-obsidian-700 bg-obsidian-800 text-obsidian-300 transition hover:border-gold/40 hover:text-gold" data-id="${prod.id}">+</button>
                    </div>
                    <div class="text-right sm:w-24">
                        <p class="font-bold text-gold">₦${subtotal.toLocaleString()}</p>
                        <button class="remove-item mt-1 text-xs text-obsidian-500 transition hover:text-red-400" data-id="${prod.id}">Remove</button>
                    </div>
                </div>
            `;
        });

        const discount = getDiscountAmount(total);
        const finalTotal = total - discount;
        const couponMessage = couponCode === 'PHARMRON10'
            ? '<p class="mt-3 text-sm text-emerald-300">Coupon applied: PHARMRON10 — 10% off</p>'
            : couponCode
                ? '<p class="mt-3 text-sm text-red-400">Coupon not recognized.</p>'
                : '';

        let html = `
            <div class="rounded-2xl border border-obsidian-700 bg-obsidian-900 p-5 sm:p-6">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input id="coupon-input" type="text" class="min-w-0 flex-1 rounded-2xl border border-obsidian-700 bg-obsidian-950 px-4 py-3 text-sm text-white placeholder:text-obsidian-500 focus:border-gold focus:ring-2 focus:ring-gold/20" placeholder="Coupon code" value="${couponCode}" />
                    <button id="apply-coupon" class="inline-flex shrink-0 items-center justify-center rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-obsidian-950 transition hover:bg-gold-light">Apply Code</button>
                </div>
                ${couponMessage}
            </div>
            <div class="space-y-4">${itemsHtml}</div>
        `;

        // Build WhatsApp checkout URL
        const orderLines = cart.map(c => {
            const p = allProducts.find(x => x.id === c.id);
            return p ? `- ${p.name} x${c.qty} (${p.price})` : '';
        }).filter(Boolean).join('\n');
        const waCheckoutUrl = `https://wa.me/2348037341221?text=${encodeURIComponent('Hello Pharmron, I would like to order:\n' + orderLines + '\n\nTotal: ₦' + finalTotal.toLocaleString())}`;

        // Summary
        html += `
            <div class="mt-10 rounded-xl border border-gold/20 bg-obsidian-900 p-6 sm:p-8">
                <div class="mb-4 flex items-center justify-between">
                    <span class="text-obsidian-400">Subtotal</span>
                    <span class="font-bold text-white">₦${total.toLocaleString()}</span>
                </div>
                ${discount ? `<div class="mb-4 flex items-center justify-between text-emerald-300"><span>Discount</span><span>-₦${discount.toLocaleString()}</span></div>` : ``}

                <!-- Shipping Section -->
                <div class="mb-6">
                    <h3 class="mb-3 text-sm font-medium text-obsidian-300">Shipping Information</h3>

                    <!-- Email Input -->
                    <div class="mb-4">
                        <label for="checkout-email" class="mb-2 block text-xs font-medium text-obsidian-400">Email Address</label>
                        <input id="checkout-email" type="email" required class="w-full rounded-lg border border-obsidian-700 bg-obsidian-950 px-3 py-2 text-sm text-white focus:border-gold focus:ring-2 focus:ring-gold/20" placeholder="your@email.com">
                    </div>

                    <!-- Phone Input -->
                    <div class="mb-4">
                        <label for="checkout-phone" class="mb-2 block text-xs font-medium text-obsidian-400">Phone Number</label>
                        <input id="checkout-phone" type="tel" required class="w-full rounded-lg border border-obsidian-700 bg-obsidian-950 px-3 py-2 text-sm text-white focus:border-gold focus:ring-2 focus:ring-gold/20" placeholder="e.g. 08012345678" pattern="[0-9]{10,15}">
                        <p id="phone-requirement" class="mt-1 text-xs text-obsidian-400">We need your phone number for order confirmation and delivery updates.</p>
                    </div>

                    <!-- Shipping Address Input -->
                    <div class="mb-4">
                        <label for="checkout-address" class="mb-2 block text-xs font-medium text-obsidian-400">Shipping Address</label>
                        <textarea id="checkout-address" required class="w-full rounded-lg border border-obsidian-700 bg-obsidian-950 px-3 py-2 text-sm text-white focus:border-gold focus:ring-2 focus:ring-gold/20" placeholder="Enter your full delivery address (street, city, state)" rows="2"></textarea>
                        <p class="mt-1 text-xs text-obsidian-400">We need your address to deliver your order.</p>
                    </div>

                    <!-- Shipping Select -->
                    <div>
                        <label for="shipping-state" class="mb-2 block text-xs font-medium text-obsidian-400">Shipping Location</label>
                        <select id="shipping-state" class="w-full rounded-lg border border-obsidian-700 bg-obsidian-950 px-3 py-2 text-sm text-white focus:border-gold focus:ring-2 focus:ring-gold/20">
                            <option value="lagos">Lagos State</option>
                            <option value="other">Other Nigerian States</option>
                        </select>
                        <p id="shipping-description" class="mt-2 text-xs text-obsidian-400">Free shipping for 5+ products in Lagos</p>
                    </div>
                </div>

                <div class="mb-8 flex items-center justify-between">
                    <span class="text-lg font-bold text-white">Total</span>
                    <span id="cart-total" class="text-2xl font-black text-gold">₦${finalTotal.toLocaleString()}</span>
                </div>

                <div class="flex flex-wrap gap-3">
                    <button id="pay-with-card" class="flex-1 rounded-xl bg-gold px-6 py-3.5 text-center text-sm font-bold text-obsidian-950 shadow-lg shadow-gold/25 transition hover:bg-gold-light">
                        Pay with Card
                    </button>
                    <a href="${waCheckoutUrl}" target="_blank" rel="noopener" class="flex-1 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-6 py-3.5 text-center text-sm font-bold text-emerald-300 transition hover:bg-emerald-900/50">
                        Order via WhatsApp
                    </a>
                </div>

                <div class="mt-4 text-center">
                    <button id="clear-cart" class="text-xs text-obsidian-500 transition hover:text-red-400">Clear Cart</button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        const couponInput = document.getElementById('coupon-input');
        const applyCouponButton = document.getElementById('apply-coupon');
        if (applyCouponButton && couponInput) {
            applyCouponButton.addEventListener('click', () => {
                couponCode = couponInput.value.trim().toUpperCase();
                saveCoupon();
                renderCart();
            });
            couponInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    applyCouponButton.click();
                }
            });
        }

        // Qty handlers
        container.querySelectorAll('.qty-down').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = cart.find(c => c.id === btn.dataset.id);
                if (item) { item.qty = Math.max(1, item.qty - 1); saveCart(); renderCart(); }
            });
        });
        container.querySelectorAll('.qty-up').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = cart.find(c => c.id === btn.dataset.id);
                if (item) { item.qty += 1; saveCart(); renderCart(); }
            });
        });
        container.querySelectorAll('.qty-input').forEach(inp => {
            inp.addEventListener('change', () => {
                const item = cart.find(c => c.id === inp.dataset.id);
                if (item) { item.qty = Math.max(1, parseInt(inp.value) || 1); saveCart(); renderCart(); }
            });
        });
        container.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', () => {
                cart = cart.filter(c => c.id !== btn.dataset.id);
                saveCart(); renderCart();
            });
        });
        const clearBtn = document.getElementById('clear-cart');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                cart = [];
                saveCart();
                renderCart();
            });
        }

        // Shipping state change handler
        const shippingSelect = document.getElementById('shipping-state');
        const shippingDesc = document.getElementById('shipping-description');
        const totalDisplay = document.getElementById('cart-total');

        function updateShippingDisplay() {
            const state = shippingSelect.value;
            const shippingFee = getShippingFee(cart, state);
            const subtotal = cart.reduce((sum, item) => {
                const prod = allProducts.find(p => p.id === item.id);
                return prod ? sum + (prod.priceNum * item.qty) : sum;
            }, 0);
            const discount = getDiscountAmount(subtotal);
            const total = subtotal - discount + shippingFee;

            totalDisplay.textContent = `₦${total.toLocaleString()}`;
            shippingDesc.textContent = getShippingDescription(state, cart);
        }

        if (shippingSelect) {
            shippingSelect.addEventListener('change', updateShippingDisplay);
            updateShippingDisplay(); // Initialize
        }

        // Pay with card handler
        const payButton = document.getElementById('pay-with-card');
        const emailInput = document.getElementById('checkout-email');
        const phoneInput = document.getElementById('checkout-phone');
        const addressInput = document.getElementById('checkout-address');

        if (payButton && emailInput && phoneInput && addressInput) {
            payButton.addEventListener('click', () => {
                const email = emailInput.value.trim();
                const phoneNumber = phoneInput.value.trim();
                const address = addressInput.value.trim();

                if (!email) {
                    showToast('Please enter your email address');
                    return;
                }

                if (!phoneNumber || phoneNumber.length < 10) {
                    showToast('Please enter a valid phone number (10-15 digits)');
                    return;
                }

                if (!address) {
                    showToast('Please enter your shipping address');
                    return;
                }

                const state = shippingSelect.value;
                const shippingFee = getShippingFee(cart, state);
                const subtotal = cart.reduce((sum, item) => {
                    const prod = allProducts.find(p => p.id === item.id);
                    return prod ? sum + (prod.priceNum * item.qty) : sum;
                }, 0);
                const discount = getDiscountAmount(subtotal);
                const total = subtotal - discount + shippingFee;

                const items = cart.map(item => {
                    const product = allProducts.find(p => p.id === item.id);
                    return product ? {
                        product: product.name,
                        quantity: item.qty,
                        price: product.price
                    } : null;
                }).filter(Boolean);

                const metadata = {
                    custom_fields: [
                        {
                            display_name: 'Items',
                            variable_name: 'items',
                            value: JSON.stringify(items)
                        },
                        {
                            display_name: 'Shipping',
                            variable_name: 'shipping',
                            value: state === 'lagos' ? 'Lagos' : 'Other States'
                        },
                        {
                            display_name: 'Phone',
                            variable_name: 'phone',
                            value: phoneNumber
                        },
                        {
                            display_name: 'Address',
                            variable_name: 'address',
                            value: address
                        }
                    ]
                };

                initializePaystackPayment(email, total, metadata);
            });
        }
    }

    renderCart();
}
/* ------------------------------------------------------------------ */
/*  Paystack Payment Helpers                                          */
/* ------------------------------------------------------------------ */

function calculateTotalWithShipping(price, shippingFeeStr) {
    const priceNum = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0;
    const shippingNum = parseFloat(String(shippingFeeStr).replace(/[^0-9.]/g, '')) || 0;
    return priceNum + shippingNum;
}

function initializePaystackPayment(email, totalAmount, metadata) {
    const paystackPublicKey = PAYSTACK_PUBLIC_KEY;

    if (typeof PaystackPop === 'undefined') {
        showToast('Payment system is loading. Please try again.');
        return;
    }

    const handler = PaystackPop.setup({
        key: paystackPublicKey,
        email: email,
        amount: Math.round(totalAmount) * 100, // Paystack expects amount in kobo
        currency: 'NGN',
        ref: 'PHARMRON-' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
        metadata: metadata,
        callback: function(response) {
            showToast('✅ Payment successful! Reference: ' + response.reference);

            // Extract order details from metadata for notification
            const fields = metadata.custom_fields || [];
            const getField = (name) => {
                const f = fields.find(cf => cf.variable_name === name);
                return f ? f.value : '';
            };

            const phoneNumber = getField('phone');
            const address = getField('address');
            const shippingLocation = getField('shipping');
            const productName = getField('product');
            const quantity = getField('quantity');

            // Determine items list
            let items = null;
            const itemsRaw = getField('items');
            if (itemsRaw) {
                try { items = JSON.parse(itemsRaw); } catch(e) { items = null; }
            }

            if (!items && productName) {
                items = [{ product: productName, quantity: parseInt(quantity) || 1 }];
            }

            // Send order notification
            sendOrderNotification({
                customer_email: email,
                phone: phoneNumber,
                address: address || 'Not provided',
                shipping_location: shippingLocation || 'Not specified',
                product_name: productName || 'Multiple items',
                quantity: quantity || (items ? items.length : 1),
                product_price: '₦' + Number(totalAmount).toLocaleString(),
                amount: totalAmount,
                items: items,
                reference: response.reference
            });

            // Clear cart on successful payment
            cart = [];
            saveCart();
            // Reload cart page if on cart page
            const cartContainer = document.getElementById('cart-page');
            if (cartContainer && typeof initCartPage === 'function') {
                initCartPage(allProducts);
            }
        },
        onClose: function() {
            showToast('Payment window closed.');
        }
    });

    handler.openIframe();
}

/* ------------------------------------------------------------------ */
/*  Order Notification Webhook                                         */
/* ------------------------------------------------------------------ */

async function sendOrderNotification(orderData) {
    if (!ORDER_WEBHOOK_URL) {
        console.warn('ORDER_WEBHOOK_URL not configured — skipping notification');
        return;
    }

    try {
        const response = await fetch(ORDER_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_email: orderData.customer_email,
                phone: orderData.phone,
                address: orderData.address,
                shipping_location: orderData.shipping_location,
                product_name: orderData.product_name,
                quantity: orderData.quantity,
                product_price: orderData.product_price,
                amount: orderData.amount,
                items: orderData.items,
                reference: orderData.reference,
                timestamp: new Date().toISOString()
            })
        });

        const result = await response.json();
        console.log('Order notification sent:', result);
    } catch (error) {
        console.error('Failed to send order notification:', error);
    }
}

/* ------------------------------------------------------------------ */
/*  Main Init                                                          */
/* ------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', async () => {
    updateCartBadge();

    try {
        allProducts = await fetchProducts();

        // Detect which page we're on
        const isHome = document.getElementById('product-grid') !== null;
        const isProduct = document.getElementById('product-detail') !== null;
        const isCart = document.getElementById('cart-page') !== null;

        if (isHome) { initHomePage(allProducts); initLeadMagnet(); }
        if (isProduct) initProductPage(allProducts);
        if (isCart) initCartPage(allProducts);

        // Dispatch event for carousel initialization
        if (isHome) {
            // Dispatch custom event with products data
            const event = new CustomEvent('pharmron:products-loaded', {
                detail: { products: allProducts }
            });
            document.dispatchEvent(event);

            // Also set global for fallback
            window.__pharmronProducts = allProducts;
        }

    } catch (error) {
        console.error('Pharmron: Init error', error);
        const grid = document.getElementById('product-grid');
        if (grid) {
            grid.innerHTML = `<div class="col-span-full flex flex-col items-center py-20 text-center"><p class="text-obsidian-400">Could not load products.</p><p class="mt-1 text-xs text-obsidian-500">${error.message}</p></div>`;
        }
    }
});