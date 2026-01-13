// ============================================
// Student App - Main Logic
// ============================================

import { db } from './firebase-config.js';
import {
    collection,
    getDocs,
    addDoc,
    onSnapshot,
    doc,
    serverTimestamp,
    query,
    where,
    orderBy,
    limit,
    runTransaction
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    menuItems: [],
    cart: [],
    favorites: JSON.parse(localStorage.getItem('favorites')) || [],
    selectedCategory: 'all',
    searchQuery: '',
    isStoreOpen: true,
    darkMode: localStorage.getItem('theme') === 'dark'
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initEventListeners();
    listenToStoreStatus();
    listenToMenu();
    loadCart();
    updateCartUI();
});

// ============================================
// THEME MANAGEMENT
// ============================================
function initTheme() {
    if (state.darkMode) {
        document.body.classList.add('dark-mode');
    }
}

function toggleTheme() {
    state.darkMode = !state.darkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', state.darkMode ? 'dark' : 'light');
}

// ============================================
// EVENT LISTENERS
// ============================================
function initEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Search
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');

    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        searchClear.style.display = state.searchQuery ? 'flex' : 'none';
        renderMenu();
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        searchClear.style.display = 'none';
        renderMenu();
    });

    // Category filters
    document.querySelectorAll('.category-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.selectedCategory = e.target.dataset.category;
            renderMenu();
        });
    });

    // Cart button
    document.getElementById('fabCart').addEventListener('click', () => {
        document.getElementById('cartModal').classList.add('active');
    });

    document.getElementById('closeCartBtn').addEventListener('click', () => {
        document.getElementById('cartModal').classList.remove('active');
    });

    // Checkout
    document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);

    // Close modal on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// ============================================
// FIREBASE LISTENERS
// ============================================
function listenToStoreStatus() {
    onSnapshot(doc(db, 'config', 'store'), (docSnap) => {
        if (docSnap.exists()) {
            state.isStoreOpen = docSnap.data().isOpen;
            const banner = document.getElementById('storeStatusBanner');
            banner.style.display = state.isStoreOpen ? 'none' : 'flex';
            renderMenu();
        }
    }, handleFirebaseError);
}

function listenToMenu() {
    const menuContainer = document.getElementById('menuContainer');

    onSnapshot(collection(db, 'menu_items'), (snapshot) => {
        state.menuItems = [];
        snapshot.forEach((doc) => {
            state.menuItems.push({ ...doc.data(), docId: doc.id });
        });

        // Sort by ID
        state.menuItems.sort((a, b) => a.id - b.id);

        // Hide loading and render
        menuContainer.innerHTML = '';
        renderMenu();
    }, handleFirebaseError);
}

// ============================================
// RENDER FUNCTIONS
// ============================================
function renderMenu() {
    const container = document.getElementById('menuContainer');

    // Filter items
    const filteredItems = state.menuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(state.searchQuery.toLowerCase());
        const matchesCategory = state.selectedCategory === 'all' || item.category === state.selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (filteredItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No items found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }

    // Group by category
    const categories = {};
    filteredItems.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });

    // Render
    container.innerHTML = '';
    Object.keys(categories).forEach(category => {
        const section = document.createElement('div');
        section.innerHTML = `
            <h2 style="
                font-size: 18px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 16px;
                color: var(--text-secondary);
                opacity: 0.8;
            ">${category.replace('_', ' ')}</h2>
            <div class="menu-grid" id="grid-${category}"></div>
        `;
        container.appendChild(section);

        const grid = section.querySelector(`#grid-${category}`);
        categories[category].forEach(item => {
            grid.appendChild(createMenuCard(item));
        });
    });
}

function createMenuCard(item) {
    const card = document.createElement('div');
    card.className = 'menu-card';

    const stock = item.stock !== undefined ? item.stock : 9999;
    const isSoldOut = item.isAvailable === false || stock <= 0;
    const isLowStock = !isSoldOut && stock < 20;
    const cartCount = getItemQuantity(item.id);
    const isFavorite = state.favorites.includes(item.id);

    if (isSoldOut) {
        card.classList.add('sold-out');
    }

    card.innerHTML = `
        ${!isSoldOut ? `
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(${item.id})">
                <svg viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
        ` : ''}
        
        <div class="item-icon">${item.image}</div>
        
        <div class="item-details">
            <div class="item-name">${item.name}</div>
            
            <div class="item-meta">
                <div class="item-price">₹${item.price}</div>
                ${item.prep_time ? `
                    <div class="item-time">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        ${item.prep_time}m
                    </div>
                ` : ''}
            </div>
            
            ${isLowStock ? `<div class="stock-warning">⚠️ Only ${stock} left!</div>` : ''}
        </div>
        
        <div class="item-actions">
            ${cartCount === 0 ? `
                <button class="btn-add" onclick="addToCart(${item.id})" ${!state.isStoreOpen || isSoldOut ? 'disabled' : ''}>
                    ${!state.isStoreOpen ? 'CLOSED' : isSoldOut ? 'SOLD OUT' : 'ADD'}
                </button>
            ` : `
                <div class="qty-control">
                    <button class="qty-btn" onclick="removeFromCart(${item.id})">−</button>
                    <div class="qty-value">${cartCount}</div>
                    <button class="qty-btn" onclick="addToCart(${item.id})">+</button>
                </div>
            `}
        </div>
    `;

    return card;
}

// ============================================
// CART MANAGEMENT
// ============================================
function loadCart() {
    const saved = localStorage.getItem('cart');
    if (saved) {
        try {
            state.cart = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load cart:', e);
            state.cart = [];
        }
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(state.cart));
}

window.addToCart = function (itemId) {
    const item = state.menuItems.find(i => i.id === itemId);
    if (!item) return;

    // Check stock
    const currentQty = getItemQuantity(itemId);
    const stock = item.stock !== undefined ? item.stock : 9999;

    if (currentQty >= stock) {
        showToast('Stock Limit', `Only ${stock} ${item.name} available`, 'warning');
        return;
    }

    state.cart.push(item);
    saveCart();
    updateCartUI();
    renderMenu();

    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    showToast('Added to Cart', `${item.name} added`, 'success');
};

window.removeFromCart = function (itemId) {
    const index = state.cart.findIndex(i => i.id === itemId);
    if (index > -1) {
        const item = state.cart[index];
        state.cart.splice(index, 1);
        saveCart();
        updateCartUI();
        renderMenu();

        showToast('Removed', `${item.name} removed from cart`, 'info');
    }
};

function getItemQuantity(itemId) {
    return state.cart.filter(i => i.id === itemId).length;
}

function updateCartUI() {
    const fabCart = document.getElementById('fabCart');
    const cartBadge = document.getElementById('cartBadge');

    if (state.cart.length > 0) {
        fabCart.style.display = 'flex';
        cartBadge.textContent = state.cart.length;
    } else {
        fabCart.style.display = 'none';
    }

    renderCartItems();
}

function renderCartItems() {
    const container = document.getElementById('cartItemsList');
    const subtotal = document.getElementById('cartSubtotal');
    const total = document.getElementById('cartTotal');

    if (state.cart.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p>Add some delicious items to get started</p>
            </div>
        `;
        subtotal.textContent = '₹0';
        total.textContent = '₹0';
        return;
    }

    // Group items
    const grouped = {};
    state.cart.forEach(item => {
        if (!grouped[item.id]) {
            grouped[item.id] = { ...item, quantity: 0, totalPrice: 0 };
        }
        grouped[item.id].quantity++;
        grouped[item.id].totalPrice += item.price;
    });

    // Render
    container.innerHTML = '';
    Object.values(grouped).forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-icon">${item.image}</div>
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">₹${item.price} × ${item.quantity}</div>
            </div>
            <div class="cart-item-controls">
                <div class="qty-control">
                    <button class="qty-btn" onclick="removeFromCart(${item.id})">−</button>
                    <div class="qty-value">${item.quantity}</div>
                    <button class="qty-btn" onclick="addToCart(${item.id})">+</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    // Calculate total
    const totalAmount = state.cart.reduce((sum, item) => sum + item.price, 0);
    subtotal.textContent = `₹${totalAmount}`;
    total.textContent = `₹${totalAmount}`;
}

// ============================================
// CHECKOUT
// ============================================
async function handleCheckout() {
    if (state.cart.length === 0) {
        showToast('Cart Empty', 'Add items to place order', 'warning');
        return;
    }

    const btn = document.getElementById('checkoutBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; margin: 0;"></div> Processing...';

    try {
        // Generate order ID
        const now = new Date();
        const orderId = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}-${Math.floor(Math.random() * 100)}`;

        // Calculate total
        const total = state.cart.reduce((sum, item) => sum + item.price, 0);

        // Group items for QR
        const itemCounts = {};
        state.cart.forEach(item => {
            if (!itemCounts[item.name]) {
                itemCounts[item.name] = { count: 0, price: 0 };
            }
            itemCounts[item.name].count++;
            itemCounts[item.name].price += item.price;
        });

        // Flatten for analytics
        const itemsList = state.cart.map(item => item.name);

        // Create QR data
        let qrData = `REF: ${orderId}\n----------------\n`;
        Object.keys(itemCounts).forEach(name => {
            const item = itemCounts[name];
            const display = item.count > 1 ? `${name} x${item.count}` : name;
            qrData += `${display}\n`;
        });
        qrData += `----------------\nTOTAL: ₹${total}\n[VERIFIED]`;

        // Save to Firebase
        await addDoc(collection(db, 'orders'), {
            order_id: orderId,
            amount: total,
            raw_text: qrData,
            items_list: itemsList,
            timestamp: serverTimestamp(),
            status: 'pending',
            user_id: getUserId()
        });

        // Show receipt
        showReceipt(orderId, itemCounts, total, qrData);

        // Clear cart
        state.cart = [];
        saveCart();
        updateCartUI();
        renderMenu();

        document.getElementById('cartModal').classList.remove('active');

    } catch (error) {
        console.error('Checkout error:', error);
        showToast('Error', 'Failed to place order. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <span>Proceed to Checkout</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        `;
    }
}

function showReceipt(orderId, items, total, qrData) {
    const modal = document.getElementById('receiptModal');

    document.getElementById('receiptOrderId').textContent = orderId;
    document.getElementById('receiptTotal').textContent = total;

    // Render items
    const itemsContainer = document.getElementById('receiptItems');
    itemsContainer.innerHTML = '';
    Object.keys(items).forEach(name => {
        const item = items[name];
        const div = document.createElement('div');
        div.className = 'receipt-item';
        div.innerHTML = `
            <span>${name} ${item.count > 1 ? `x${item.count}` : ''}</span>
            <span>₹${item.price}</span>
        `;
        itemsContainer.appendChild(div);
    });

    // Generate QR
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
    document.getElementById('receiptQR').src = qrUrl;

    modal.classList.add('active');
}

// ============================================
// FAVORITES
// ============================================
window.toggleFavorite = function (itemId) {
    const index = state.favorites.indexOf(itemId);
    if (index > -1) {
        state.favorites.splice(index, 1);
    } else {
        state.favorites.push(itemId);
    }
    localStorage.setItem('favorites', JSON.stringify(state.favorites));
    renderMenu();
};

// ============================================
// UTILITIES
// ============================================
function getUserId() {
    let userId = localStorage.getItem('user_id');
    if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('user_id', userId);
    }
    return userId;
}

function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '<circle cx="12" cy="12" r="10"></circle><polyline points="9 12 12 15 16 10"></polyline>',
        error: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
        warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
        info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${icons[type]}
            </svg>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function handleFirebaseError(error) {
    console.error('Firebase error:', error);
    showToast('Connection Error', 'Failed to sync data', 'error');
}