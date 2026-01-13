// ============================================
// Admin POS - Main Logic
// ============================================

import { db } from './firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    doc,
    increment,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    runTransaction
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    currentScan: null,
    scanner: null,
    historyUnsubscribe: null
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Display current date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    // Setup history filter
    const filterSelect = document.getElementById('historyFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', updateHistoryFilter);
    }
});

// ============================================
// AUTHENTICATION
// ============================================
window.handleLogin = function () {
    const pin = document.getElementById('adminPin').value;

    // In production, use Firebase Authentication!
    if (pin === 'admin123') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('posApp').style.display = 'block';

        // Start listening to data
        listenToLiveStats();
        updateHistoryFilter();
    } else {
        alert('Invalid PIN. Try: admin123');
    }
};

window.handleLogout = function () {
    if (confirm('Are you sure you want to logout?')) {
        // Cleanup listeners
        if (state.historyUnsubscribe) {
            state.historyUnsubscribe();
        }

        document.getElementById('posApp').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminPin').value = '';
    }
};

// ============================================
// LIVE STATS
// ============================================
function listenToLiveStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
        collection(db, 'orders'),
        where('timestamp', '>=', today)
    );

    onSnapshot(q, (snapshot) => {
        let totalRevenue = 0;
        let totalOrders = 0;
        let maxToken = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            totalRevenue += data.amount || 0;
            totalOrders++;

            if (data.token && data.token > maxToken) {
                maxToken = data.token;
            }
        });

        // Update UI
        document.getElementById('dailyRevenue').textContent = totalRevenue;
        document.getElementById('dailyOrders').textContent = totalOrders;
        document.getElementById('lastToken').textContent = maxToken > 0 ? maxToken : '--';
    }, handleError);
}

// ============================================
// HISTORY MANAGEMENT
// ============================================
window.updateHistoryFilter = function () {
    const filter = document.getElementById('historyFilter').value;
    const start = new Date();
    let end = null;

    start.setHours(0, 0, 0, 0);

    if (filter === 'yesterday') {
        start.setDate(start.getDate() - 1);
        end = new Date();
        end.setHours(0, 0, 0, 0);
    } else if (filter === 'week') {
        start.setDate(start.getDate() - 7);
    }

    loadHistory(start, end);
};

function loadHistory(startDate, endDate) {
    // Cleanup previous listener
    if (state.historyUnsubscribe) {
        state.historyUnsubscribe();
    }

    const container = document.getElementById('historyContainer');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading orders...</p></div>';

    // Build query
    let q;
    if (endDate) {
        q = query(
            collection(db, 'orders'),
            where('timestamp', '>=', startDate),
            where('timestamp', '<', endDate),
            orderBy('timestamp', 'desc')
        );
    } else {
        q = query(
            collection(db, 'orders'),
            where('timestamp', '>=', startDate),
            orderBy('timestamp', 'desc')
        );
    }

    // Listen to changes
    state.historyUnsubscribe = onSnapshot(q, (snapshot) => {
        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No orders found</h3>
                    <p>Orders will appear here once scanned</p>
                </div>
            `;
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const card = createHistoryCard(data);
            container.appendChild(card);
        });
    }, handleError);
}

function createHistoryCard(data) {
    const card = document.createElement('div');
    card.className = 'history-card';

    const dateObj = data.timestamp ? data.timestamp.toDate() : new Date();
    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = dateObj.toLocaleDateString();

    card.innerHTML = `
        <div class="history-info">
            <div class="history-token">
                <span class="token-badge">#${data.token || '---'}</span>
            </div>
            <div class="history-meta">
                <span>${date}</span>
                <span>${time}</span>
            </div>
        </div>
        <div class="history-amount">+₹${data.amount || 0}</div>
    `;

    card.addEventListener('click', () => openDetailModal(data, time, date));

    return card;
}

// ============================================
// QR SCANNER
// ============================================
window.openScanner = function () {
    const modal = document.getElementById('scannerModal');
    modal.classList.add('active');

    if (!state.scanner) {
        state.scanner = new Html5QrcodeScanner("qrReader", {
            fps: 10,
            qrbox: 250,
            aspectRatio: 1.0
        });

        state.scanner.render(onScanSuccess, onScanError);
    }
};

window.closeScanner = function () {
    document.getElementById('scannerModal').classList.remove('active');
    document.getElementById('scanResultCard').style.display = 'none';
};

window.resetScanner = function () {
    document.getElementById('scanResultCard').style.display = 'none';
    state.currentScan = null;
};

function onScanSuccess(decodedText) {
    console.log('QR Scanned:', decodedText);

    // Parse QR data
    const lines = decodedText.split('\n');
    const orderRef = lines[0].replace('REF: ', '').trim();

    // Extract amount
    const totalLine = lines.find(line => line.includes('TOTAL:'));
    const amount = totalLine ? parseInt(totalLine.match(/₹(\d+)/)[1]) : 0;

    // Extract items
    const items = [];
    let isReadingItems = false;

    for (const line of lines) {
        if (line.includes('TOTAL:')) break;
        if (isReadingItems && line.trim() !== '' && !line.includes('---')) {
            items.push(line.trim());
        }
        if (line.includes('----')) {
            isReadingItems = true;
        }
    }

    // Store current scan
    state.currentScan = {
        orderRef,
        amount,
        items,
        rawText: decodedText
    };

    // Display result
    document.getElementById('scannedOrderRef').textContent = orderRef;
    document.getElementById('scannedAmount').textContent = amount;

    const itemsList = document.getElementById('scannedItemsList');
    itemsList.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'scanned-item';
        div.innerHTML = `<span>${item}</span>`;
        itemsList.appendChild(div);
    });

    document.getElementById('scanResultCard').style.display = 'block';
}

function onScanError(error) {
    // Ignore scan errors (too many console logs otherwise)
}

// ============================================
// ORDER PROCESSING
// ============================================
window.acceptOrder = async function () {
    if (!state.currentScan) return;

    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0;"></div>';

    try {
        // Parse items for stock deduction
        const itemsForStock = [];
        state.currentScan.items.forEach(itemStr => {
            // Handle "Item x2" format
            const qtyMatch = itemStr.match(/(.+) x(\d+)$/);
            if (qtyMatch) {
                itemsForStock.push({
                    name: qtyMatch[1].trim(),
                    qty: parseInt(qtyMatch[2])
                });
            } else {
                itemsForStock.push({
                    name: itemStr.trim(),
                    qty: 1
                });
            }
        });

        // Check stock availability
        const menuSnapshot = await getDocs(collection(db, 'menu_items'));
        const menuMap = new Map();
        menuSnapshot.forEach(doc => {
            const data = doc.data();
            menuMap.set(data.name, { docId: doc.id, ...data });
        });

        // Validate stock
        for (const orderItem of itemsForStock) {
            const menuItem = menuMap.get(orderItem.name);
            if (menuItem) {
                const currentStock = menuItem.stock !== undefined ? menuItem.stock : 9999;
                if (currentStock < orderItem.qty) {
                    throw new Error(`Insufficient stock for ${orderItem.name}. Available: ${currentStock}`);
                }
            }
        }

        // Deduct stock
        for (const orderItem of itemsForStock) {
            const menuItem = menuMap.get(orderItem.name);
            if (menuItem && menuItem.stock < 9000) {
                const newStock = menuItem.stock - orderItem.qty;
                await updateDoc(doc(db, 'menu_items', menuItem.docId), {
                    stock: newStock,
                    isAvailable: newStock > 0
                });
            }
        }

        // Generate token number
        const tokenNumber = await generateTokenNumber();

        // Flatten items for analytics
        const analyticsList = [];
        itemsForStock.forEach(item => {
            for (let i = 0; i < item.qty; i++) {
                analyticsList.push(item.name);
            }
        });

        // Save order
        await addDoc(collection(db, 'orders'), {
            token: tokenNumber,
            amount: state.currentScan.amount,
            raw_text: state.currentScan.rawText,
            items_list: analyticsList,
            order_id: state.currentScan.orderRef,
            timestamp: serverTimestamp(),
            status: 'paid'
        });

        // Show token
        document.getElementById('displayToken').textContent = tokenNumber;
        document.getElementById('scannerModal').classList.remove('active');
        document.getElementById('tokenModal').classList.add('active');

        // Reset scanner
        state.currentScan = null;
        document.getElementById('scanResultCard').style.display = 'none';

    } catch (error) {
        console.error('Order processing error:', error);
        alert(`Error: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Accept Order
        `;
    }
};

async function generateTokenNumber() {
    // Get today's date string
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Use transaction for atomic counter increment
    const counterRef = doc(db, 'counters', 'daily_token');

    return await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);

        let nextToken = 101; // Starting token

        if (counterDoc.exists()) {
            const data = counterDoc.data();
            if (data.date === dateStr) {
                nextToken = data.value + 1;
            }
        }

        transaction.set(counterRef, {
            value: nextToken,
            date: dateStr
        });

        return nextToken;
    });
}

// ============================================
// MODALS
// ============================================
window.closeTokenModal = function () {
    document.getElementById('tokenModal').classList.remove('active');
};

window.openDetailModal = function (data, time, date) {
    const modal = document.getElementById('detailModal');

    document.getElementById('detailToken').textContent = data.token || '---';
    document.getElementById('detailTime').textContent = time;
    document.getElementById('detailDate').textContent = date;
    document.getElementById('detailTotal').textContent = data.amount || 0;

    // Parse items
    const itemsList = document.getElementById('detailItemsList');
    itemsList.innerHTML = '';

    if (data.raw_text) {
        const lines = data.raw_text.split('\n');
        let isReadingItems = false;

        for (const line of lines) {
            if (line.includes('TOTAL:')) break;
            if (isReadingItems && line.trim() !== '' && !line.includes('---')) {
                const div = document.createElement('div');
                div.className = 'detail-item';
                div.innerHTML = `<span>${line.trim()}</span>`;
                itemsList.appendChild(div);
            }
            if (line.includes('----')) {
                isReadingItems = true;
            }
        }
    }

    modal.classList.add('active');
};

window.closeDetailModal = function () {
    document.getElementById('detailModal').classList.remove('active');
};

// ============================================
// ERROR HANDLING
// ============================================
function handleError(error) {
    console.error('Firebase error:', error);
    alert('Connection error. Please check your internet connection.');
}