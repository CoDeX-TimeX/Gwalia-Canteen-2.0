// ============================================
// Kitchen Display - Main Logic
// ============================================

import { db } from './firebase-config.js';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    orders: new Map(),
    lastNotificationTime: 0,
    audio: null
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initAudio();
    listenToOrders();
});

// ============================================
// CLOCK
// ============================================
function initClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    const timeEl = document.getElementById('currentTime');
    if (timeEl) {
        timeEl.textContent = timeStr;
    }
}

// ============================================
// AUDIO NOTIFICATIONS
// ============================================
function initAudio() {
    state.audio = document.getElementById('notificationSound');
}

function playNotification() {
    // Throttle notifications (max once per 2 seconds)
    const now = Date.now();
    if (now - state.lastNotificationTime < 2000) {
        return;
    }

    state.lastNotificationTime = now;

    if (state.audio) {
        state.audio.play().catch(err => {
            console.log('Audio play failed:', err);
        });
    }

    // Browser notification (if permitted)
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Order!', {
            body: 'A new order has been received',
            icon: '/assets/icons/icon-192.png',
            tag: 'kitchen-order'
        });
    }
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// ============================================
// FIREBASE LISTENERS
// ============================================
function listenToOrders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Listen to pending and preparing orders
    const q = query(
        collection(db, 'orders'),
        where('timestamp', '>=', today),
        where('status', 'in', ['paid', 'preparing']),
        orderBy('timestamp', 'asc')
    );

    onSnapshot(q, (snapshot) => {
        const changes = snapshot.docChanges();

        changes.forEach(change => {
            const docData = { id: change.doc.id, ...change.doc.data() };

            if (change.type === 'added') {
                // New order
                state.orders.set(change.doc.id, docData);
                playNotification();
            } else if (change.type === 'modified') {
                // Order updated
                state.orders.set(change.doc.id, docData);
            } else if (change.type === 'removed') {
                // Order completed
                state.orders.delete(change.doc.id);
            }
        });

        renderOrders();
        updateStats();
    }, handleError);

    // Also listen for completed orders today (for stats)
    const completedQuery = query(
        collection(db, 'orders'),
        where('timestamp', '>=', today),
        where('status', '==', 'ready')
    );

    onSnapshot(completedQuery, (snapshot) => {
        const completedEl = document.getElementById('completedCount');
        if (completedEl) {
            completedEl.textContent = snapshot.size;
        }
    });
}

// ============================================
// RENDER FUNCTIONS
// ============================================
function renderOrders() {
    const container = document.getElementById('ordersGrid');

    // Clear existing orders
    container.innerHTML = '';

    if (state.orders.size === 0) {
        container.innerHTML = `
            <div class="empty-state-kitchen">
                <div class="empty-icon-kitchen">✨</div>
                <h3>All Caught Up!</h3>
                <p>No pending orders. Great work team!</p>
            </div>
        `;
        return;
    }

    // Sort orders: paid first, then by timestamp
    const sortedOrders = Array.from(state.orders.values()).sort((a, b) => {
        if (a.status === 'paid' && b.status !== 'paid') return -1;
        if (a.status !== 'paid' && b.status === 'paid') return 1;

        const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
        return timeA - timeB;
    });

    // Render each order
    sortedOrders.forEach(order => {
        const card = createOrderCard(order);
        container.appendChild(card);
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.dataset.orderId = order.id;

    // Add status class
    if (order.status === 'preparing') {
        card.classList.add('preparing');
    } else if (order.status === 'paid') {
        card.classList.add('new');
    }

    // Calculate elapsed time
    const elapsed = order.timestamp ?
        Math.floor((Date.now() - order.timestamp.toMillis()) / 1000 / 60) : 0;

    // Parse items
    const items = parseOrderItems(order);

    // Build HTML
    card.innerHTML = `
        <div class="order-header">
            <div class="order-token">
                <div class="token-number">#${order.token || '---'}</div>
            </div>
            <div class="order-time">
                <div class="time-label">${order.status === 'preparing' ? 'In Progress' : 'Received'}</div>
                <div class="time-value">${elapsed} min ago</div>
            </div>
        </div>
        
        <div class="order-divider"></div>
        
        <div class="order-items">
            ${items.map(item => `
                <div class="order-item">
                    <div class="item-name">${item.name}</div>
                    <div class="item-quantity">
                        <span class="item-quantity-icon">×</span>
                        ${item.quantity}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="order-divider"></div>
        
        <div class="order-footer">
            ${order.status === 'paid' ? `
                <button class="btn-start" onclick="startOrder('${order.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Start Cooking
                </button>
            ` : `
                <button class="btn-ready" onclick="markReady('${order.id}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Mark Ready
                </button>
            `}
        </div>
    `;

    // Add priority badge if order is old
    if (elapsed > 15 && order.status === 'paid') {
        const badge = document.createElement('div');
        badge.className = 'priority-badge';
        badge.textContent = 'URGENT';
        card.appendChild(badge);
    }

    return card;
}

function parseOrderItems(order) {
    const items = new Map();

    if (order.items_list && Array.isArray(order.items_list)) {
        // Use flattened items list (better for analytics)
        order.items_list.forEach(itemName => {
            if (!items.has(itemName)) {
                items.set(itemName, { name: itemName, quantity: 0 });
            }
            items.get(itemName).quantity++;
        });
    } else if (order.raw_text) {
        // Fallback: parse from raw QR text
        const lines = order.raw_text.split('\n');
        let isReadingItems = false;

        for (const line of lines) {
            if (line.includes('TOTAL:')) break;
            if (isReadingItems && line.trim() !== '' && !line.includes('---')) {
                const qtyMatch = line.match(/(.+) x(\d+)$/);
                if (qtyMatch) {
                    items.set(qtyMatch[1].trim(), {
                        name: qtyMatch[1].trim(),
                        quantity: parseInt(qtyMatch[2])
                    });
                } else {
                    items.set(line.trim(), {
                        name: line.trim(),
                        quantity: 1
                    });
                }
            }
            if (line.includes('----')) {
                isReadingItems = true;
            }
        }
    }

    return Array.from(items.values());
}

// ============================================
// ORDER ACTIONS
// ============================================
window.startOrder = async function (orderId) {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0;"></div>';

    try {
        await updateDoc(doc(db, 'orders', orderId), {
            status: 'preparing',
            started_at: serverTimestamp()
        });
    } catch (error) {
        console.error('Failed to start order:', error);
        alert('Failed to update order status');
    } finally {
        btn.disabled = false;
    }
};

window.markReady = async function (orderId) {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0;"></div>';

    try {
        await updateDoc(doc(db, 'orders', orderId), {
            status: 'ready',
            completed_at: serverTimestamp()
        });

        // Remove from UI immediately
        state.orders.delete(orderId);
        renderOrders();
        updateStats();

    } catch (error) {
        console.error('Failed to mark order ready:', error);
        alert('Failed to update order status');
    } finally {
        btn.disabled = false;
    }
};

// ============================================
// STATS UPDATE
// ============================================
function updateStats() {
    let queueCount = 0;
    let preparingCount = 0;

    state.orders.forEach(order => {
        if (order.status === 'paid') {
            queueCount++;
        } else if (order.status === 'preparing') {
            preparingCount++;
        }
    });

    document.getElementById('queueCount').textContent = queueCount;
    document.getElementById('preparingCount').textContent = preparingCount;
}

// ============================================
// ERROR HANDLING
// ============================================
function handleError(error) {
    console.error('Kitchen display error:', error);

    const container = document.getElementById('ordersGrid');
    container.innerHTML = `
        <div class="empty-state-kitchen">
            <div class="empty-icon-kitchen">⚠️</div>
            <h3>Connection Error</h3>
            <p>Unable to connect to the system. Please check your internet connection.</p>
            <button class="btn-primary" onclick="window.location.reload()" style="margin-top: 20px;">
                Retry Connection
            </button>
        </div>
    `;
}

// ============================================
// AUTO-REFRESH (Every 60 seconds to keep connection alive)
// ============================================
setInterval(() => {
    // Ping to keep connection active
    console.log('Kitchen display active:', new Date().toISOString());
}, 60000);