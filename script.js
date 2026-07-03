/* ===== Pharmron — Complete Product & Cart Engine ===== */

/* ------------------------------------------------------------------ */
/*  Shared State                                                       */
/* ------------------------------------------------------------------ */
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('pharmron_cart') || '[]');

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
    path = path.replace(/\.pmg$/i, '.png');
    path = path.replace('Turmeric-capsules', 'Turmeric-capsule');
    if (!path.startsWith('images/')) path = 'images/' + path;
    return path;
}

function normalizeHeader(h) {
    return h.trim().replace(/^"|"$/g, '').replace(/\s+/g, ' ');
}

/* ------------------------------------------------------------------ */
/*  Fetch Products                                                     */
/* ------------------------------------------------------------------ */
async function fetchProducts() {
    const response = await fetch('products.csv');
    const csvText = await response.text();
    const rows = parseCSVRows(csvText);
    if (rows.length < 2) return [];

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
                <img src="${product.imagePath}" alt="${product.name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22 fill=%22%23333%22%3E%3Crect width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23808080%22 font-size=%2214%22%3ENo Image%3C/text%3E%3C/svg%3E'">
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
            <div class="mt-4 flex flex-wrap gap-2">
                <a href="product.html?id=${encodeURIComponent(product.id)}" class="inline-flex items-center gap-1.5 rounded-lg border border-obsidian-700 bg-obsidian-800 px-3.5 py-2 text-xs font-medium text-obsidian-200 transition hover:border-gold/40 hover:text-gold active:scale-[0.97]">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
                    Details
                </a>
                <a href="https://wa.me/2348037341221?text=${orderMsg}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/40 bg-emerald-900/30 px-3.5 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-900/50 active:scale-[0.97]">
                    <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                </a>
                <button class="add-cart-btn inline-flex items-center gap-1.5 rounded-lg bg-gold/90 px-3.5 py-2 text-xs font-bold text-obsidian-950 transition hover:bg-gold active:scale-[0.97]" data-id="${product.id}">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                    Add to Cart
                </button>
            </div>
        </div>
    `;

    card.querySelector('.add-cart-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(product.id);
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
    const grid = document.getElementById('product-grid');
    if (!grid) return;
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
    const filterContainer = document.getElementById('filter-container');
    const grid = document.getElementById('product-grid');
    if (!filterContainer || !grid) return;

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
                    <img src="${product.imagePath}" alt="${product.name}" class="w-full object-cover" style="aspect-ratio:1/1" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23333%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23808080%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                </div>
            </div>
            <!-- Info -->
            <div class="lg:w-1/2">
                <span class="category-badge">${product.category}</span>
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

                <!-- Actions -->
                <div class="mt-10 flex flex-wrap gap-3">
                    <button id="detail-add-cart" class="inline-flex items-center gap-2.5 rounded-xl bg-gold px-7 py-3.5 text-sm font-bold text-obsidian-950 shadow-lg shadow-gold/25 transition hover:bg-gold-light active:scale-[0.97]">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                        Add to Cart
                    </button>
                    <a href="${product.paystackLink}" target="_blank" rel="noopener" class="inline-flex items-center gap-2.5 rounded-xl border border-gold/30 bg-obsidian-900 px-7 py-3.5 text-sm font-bold text-gold shadow-sm transition hover:bg-obsidian-800 active:scale-[0.97]">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>
                        Buy with Card
                    </a>
                    <a href="https://wa.me/2348037341221?text=${orderMsg}" target="_blank" rel="noopener" class="inline-flex items-center gap-2.5 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-7 py-3.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-900/50 active:scale-[0.97]">
                        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Order on WhatsApp
                    </a>
                </div>

                <!-- Back link -->
                <div class="mt-8">
                    <a href="/#products" class="inline-flex items-center gap-1.5 text-sm text-obsidian-500 transition hover:text-gold">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"/></svg>
                        Back to Products
                    </a>
                </div>
            </div>
        </div>
    `;

    document.getElementById('detail-add-cart').addEventListener('click', () => addToCart(product.id));
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

        let html = `<div class="space-y-4">`;
        let total = 0;

        cart.forEach((item, idx) => {
            const prod = allProducts.find(p => p.id === item.id);
            if (!prod) return;
            const subtotal = prod.priceNum * item.qty;
            total += subtotal;

            html += `
                <div class="cart-item flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5" data-idx="${idx}">
                    <a href="product.html?id=${encodeURIComponent(prod.id)}" class="shrink-0">
                        <img src="${prod.imagePath}" alt="${prod.name}" class="h-20 w-20 rounded-lg object-cover sm:h-24 sm:w-24" onerror="this.style.display='none'">
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

        html += `</div>`;

        // Build WhatsApp checkout URL
        const orderLines = cart.map(c => {
            const p = allProducts.find(x => x.id === c.id);
            return p ? `- ${p.name} x${c.qty} (${p.price})` : '';
        }).filter(Boolean).join('\n');
        const waCheckoutUrl = `https://wa.me/2348037341221?text=${encodeURIComponent('Hello Pharmron, I would like to order:\n' + orderLines + '\n\nTotal: ₦' + total.toLocaleString())}`;

        // Summary
        html += `
            <div class="mt-10 rounded-xl border border-gold/20 bg-obsidian-900 p-6 sm:p-8">
                <div class="mb-4 flex items-center justify-between">
                    <span class="text-obsidian-400">Subtotal</span>
                    <span class="font-bold text-white">₦${total.toLocaleString()}</span>
                </div>
                <div class="mb-6 flex items-center justify-between border-b border-obsidian-700 pb-4">
                    <span class="text-obsidian-400">Shipping</span>
                    <span class="text-sm text-obsidian-500">Calculated at checkout</span>
                </div>
                <div class="mb-8 flex items-center justify-between">
                    <span class="text-lg font-bold text-white">Total</span>
                    <span class="text-2xl font-black text-gold">₦${total.toLocaleString()}</span>
                </div>
                <div class="flex flex-wrap gap-3">
                    <a href="${(cart.length > 0 && allProducts.find(p => p.id === cart[0].id)) ? allProducts.find(p => p.id === cart[0].id).paystackLink : ''}" target="_blank" rel="noopener" class="flex-1 rounded-xl bg-gold px-6 py-3.5 text-center text-sm font-bold text-obsidian-950 shadow-lg shadow-gold/25 transition hover:bg-gold-light">
                        Checkout with Card
                    </a>
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
                saveCart(); renderCart();
            });
        }
    }

    renderCart();
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

        if (isHome) initHomePage(allProducts);
        if (isProduct) initProductPage(allProducts);
        if (isCart) initCartPage(allProducts);

    } catch (error) {
        console.error('Pharmron: Init error', error);
        const grid = document.getElementById('product-grid');
        if (grid) {
            grid.innerHTML = `<div class="col-span-full flex flex-col items-center py-20 text-center"><p class="text-obsidian-400">Could not load products.</p><p class="mt-1 text-xs text-obsidian-500">${error.message}</p></div>`;
        }
    }
});