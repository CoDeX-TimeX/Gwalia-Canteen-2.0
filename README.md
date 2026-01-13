# 🍽️ Gwalia Canteen 2.0

> A modern, real-time food ordering system for Nirma University's Gwalia Canteen. Built with vanilla JavaScript and Firebase.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Firebase](https://img.shields.io/badge/Firebase-9.22.0-orange)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Firebase Setup](#-firebase-setup)
- [Usage Guide](#-usage-guide)
- [Architecture](#-architecture)
- [Security](#-security)
- [Future Enhancements](#-future-enhancements)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🎓 Student App
- **Modern UI/UX** - Glassmorphism design with smooth animations
- **Real-time Menu** - Live stock updates from Firebase
- **Smart Cart** - Prevents ordering out-of-stock items
- **Dark Mode** - Eye-friendly theme switching
- **QR Checkout** - Generate verified QR codes for orders
- **Favorites** - Save frequently ordered items
- **Category Filters** - Quick navigation through menu
- **Search** - Find items instantly
- **Stock Warnings** - Alert when items running low
- **Responsive** - Works on all devices

### 💳 Cashier POS
- **QR Scanner** - Built-in camera scanning
- **Token Generation** - Sequential daily tokens
- **Stock Deduction** - Automatic inventory management
- **Live Dashboard** - Real-time revenue & order stats
- **Order History** - View past transactions
- **Stock Validation** - Prevents accepting orders with insufficient stock

### 📊 Manager Dashboard *(To be implemented)*
- **Inventory Control** - Edit prices, stock, availability
- **Store Toggle** - Open/close online ordering
- **Analytics** - Sales insights and trends
- **Low Stock Alerts** - Proactive inventory management

### 👨‍🍳 Kitchen Display *(To be implemented)*
- **Live Orders** - Real-time incoming orders
- **Status Updates** - Mark orders as preparing/ready
- **Audio Alerts** - Never miss an order
- **Priority Queue** - Organize by prep time

---

## 🛠 Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Grid, Flexbox
- **JavaScript ES6+** - Modules, async/await
- **No frameworks** - Pure vanilla JS for performance

### Backend & Database
- **Firebase Firestore** - NoSQL real-time database
- **Firebase Hosting** - Static site hosting *(optional)*

### Libraries
- **html5-qrcode** - QR code scanning
- **QR Server API** - QR code generation

---

## 📁 Project Structure

```
gwalia-canteen-2.0/
│
├── index.html                 # Student ordering app
├── admin.html                 # Cashier POS terminal
├── manager.html              # Manager dashboard (to be created)
├── kitchen.html              # Kitchen display (to be created)
├── analytics.html            # Analytics page (to be created)
│
├── styles/
│   ├── main.css              # Global styles & student app
│   ├── admin.css             # POS terminal styles
│   ├── manager.css           # Manager dashboard styles
│   └── kitchen.css           # Kitchen display styles
│
├── js/
│   ├── firebase-config.js    # Firebase initialization
│   ├── student-app.js        # Student app logic
│   ├── admin-pos.js          # Cashier POS logic
│   ├── manager.js            # Manager dashboard logic
│   └── kitchen.js            # Kitchen display logic
│
├── data/
│   └── menu.js               # Menu items database (for migration)
│
├── assets/
│   ├── icons/                # App icons
│   └── images/               # Brand images
│
├── .gitignore
├── README.md
└── LICENSE
```

---

## 🚀 Installation

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for Firebase)
- Firebase account (free tier works!)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gwalia-canteen-2.0.git
   cd gwalia-canteen-2.0
   ```

2. **No build tools required!** Just open `index.html` in a browser
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   
   # Or simply open index.html in your browser
   ```

3. **Configure Firebase** (see next section)

---

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "gwalia-canteen" (or your choice)
4. Disable Google Analytics (optional)
5. Create project

### 2. Enable Firestore

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Start in **test mode** (we'll add rules later)
4. Choose location (closest to you)

### 3. Get Configuration

1. Go to **Project Settings** > **Your apps**
2. Click **Web app** icon (`</>`)
3. Register app as "Gwalia Web"
4. Copy the `firebaseConfig` object
5. Replace config in `js/firebase-config.js`

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 4. Database Structure

Create these collections in Firestore:

#### **Collection: `menu_items`**
```javascript
{
    id: 1,                    // Unique number
    name: "Tea",             // String
    price: 20,               // Number (in rupees)
    category: "beverages",   // String
    image: "☕",             // Emoji or URL
    stock: 50,               // Number (9999 = unlimited)
    isAvailable: true,       // Boolean
    prep_time: 2,            // Number (in minutes)
    soldToday: 0             // Number (optional)
}
```

#### **Collection: `orders`**
```javascript
{
    order_id: "123045-99",        // String (unique)
    token: 101,                   // Number (daily sequential)
    amount: 150,                  // Number (total in rupees)
    items_list: ["Tea", "Samosa"], // Array of strings
    raw_text: "REF: 123045-99...", // String (QR data)
    timestamp: Timestamp,          // Firestore Timestamp
    status: "pending",            // String (pending/paid/ready)
    user_id: "user_abc123"        // String (optional)
}
```

#### **Collection: `config`**
```javascript
// Document ID: "store"
{
    isOpen: true  // Boolean (controls if students can order)
}
```

#### **Collection: `counters`**
```javascript
// Document ID: "daily_token"
{
    value: 101,           // Number (current token)
    date: "2025-01-14"   // String (YYYY-MM-DD)
}
```

### 5. Security Rules

Go to **Firestore Rules** and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Public read, authenticated write for menu
    match /menu_items/{itemId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Public read, authenticated write for orders
    match /orders/{orderId} {
      allow read: if true;
      allow create: if true;  // Students can create orders
      allow update, delete: if request.auth != null;
    }
    
    // Only admins can modify config
    match /config/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Only admins can modify counters
    match /counters/{counter} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 6. Upload Menu Data

Use the provided `data/menu.js` file:

```javascript
// Run this in browser console or create upload_menu.html
import { db } from './js/firebase-config.js';
import { collection, doc, setDoc } from 'firebase/firestore';
import { menuItems } from './data/menu.js';

async function uploadMenu() {
    for (const item of menuItems) {
        await setDoc(doc(db, 'menu_items', String(item.id)), {
            ...item,
            stock: item.stock || 50,
            isAvailable: true,
            prep_time: item.prep_time || 5
        });
        console.log(`✅ Uploaded: ${item.name}`);
    }
    console.log('🎉 All menu items uploaded!');
}

uploadMenu();
```

---

## 📖 Usage Guide

### For Students

1. **Browse Menu**
   - Open `index.html`
   - Search for items or filter by category
   - View prices and stock availability

2. **Add to Cart**
   - Click "ADD" on items
   - Adjust quantities with +/− buttons
   - Cart updates in real-time

3. **Checkout**
   - Click floating cart button
   - Review order
   - Click "Proceed to Checkout"

4. **Pay & Collect**
   - Show generated QR code at counter
   - Cashier scans and gives token number
   - Collect food when token is called

### For Cashiers

1. **Login**
   - Open `admin.html`
   - Enter PIN: `admin123`

2. **Scan Orders**
   - Click "Scan QR" button
   - Point camera at student's QR
   - Review order details

3. **Accept Order**
   - Check stock availability (auto-validated)
   - Click "Accept Order"
   - Give student the token number

4. **View History**
   - See all processed orders
   - Click order to view details
   - Filter by date range

### For Managers

*(To be implemented in future version)*

1. **Control Store**
   - Open/close online ordering
   - Set business hours

2. **Manage Inventory**
   - Update prices
   - Adjust stock levels
   - Mark items sold out

3. **View Analytics**
   - Track daily revenue
   - Identify best sellers
   - Monitor low stock

---

## 🏗 Architecture

### Data Flow

```
Student App → Firebase → Cashier POS → Kitchen Display
     ↓                          ↓              ↓
  QR Code              Token Number    Preparation
     ↓                          ↓              ↓
   Scan                    Deduct Stock   Mark Ready
```

### Real-time Sync

- **Firestore Listeners** - All apps sync automatically
- **Stock Updates** - Instant across all devices
- **Order Status** - Live tracking from order to pickup

### Offline Support

Currently requires internet. Future versions will include:
- Service Worker caching
- IndexedDB for offline orders
- Auto-sync when connection restored

---

## 🔒 Security

### Current Implementation

✅ Firebase Security Rules (read-only for students)  
✅ PIN-based POS access  
✅ QR code verification  
✅ Stock validation before accepting orders  
✅ Atomic transactions for tokens  

### Production Recommendations

⚠️ **Before going live, implement:**

1. **Firebase Authentication**
   ```javascript
   import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
   
   // Replace PIN system with:
   await signInWithEmailAndPassword(auth, email, password);
   ```

2. **Environment Variables**
   ```javascript
   // Don't commit API keys!
   const firebaseConfig = {
       apiKey: process.env.VITE_FIREBASE_API_KEY,
       // ...
   };
   ```

3. **Rate Limiting**
   - Implement Cloud Functions to prevent spam
   - Limit orders per user per hour

4. **HTTPS Only**
   - Always use HTTPS in production
   - Firebase Hosting provides this automatically

---

## 🚧 Future Enhancements

### Phase 2 (High Priority)
- [ ] Manager Dashboard (inventory & analytics)
- [ ] Kitchen Display System
- [ ] Order status tracking for students
- [ ] Push notifications
- [ ] Printer integration for tokens

### Phase 3 (Nice to Have)
- [ ] User accounts & order history
- [ ] Loyalty program / student discounts
- [ ] Pre-ordering & scheduled pickup
- [ ] Multi-language support (Gujarati)
- [ ] Payment gateway integration
- [ ] Nutritional information
- [ ] Allergen warnings

### Technical Improvements
- [ ] Progressive Web App (PWA)
- [ ] Offline mode
- [ ] Better error handling
- [ ] Unit tests
- [ ] CI/CD pipeline
- [ ] Performance monitoring
- [ ] Accessibility audit

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Coding Standards

- Use ES6+ features
- Follow existing code style
- Comment complex logic
- Test on multiple devices
- Update README if needed

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- Nirma University Gwalia Canteen team
- Firebase for excellent documentation
- html5-qrcode library contributors
- All beta testers and users

---

## 📞 Support

Having issues? Here's how to get help:

1. **Check the docs** - You're reading them! 📖
2. **Search existing issues** - Maybe it's already solved
3. **Create an issue** - Describe the problem clearly
4. **Discord/Slack** - Join our community *(link here)*

---

## 🎯 Quick Links

- [Live Demo](#) *(Add your hosted URL)*
- [Firebase Console](https://console.firebase.google.com/)
- [Report Bug](https://github.com/yourusername/gwalia-canteen-2.0/issues)
- [Request Feature](https://github.com/yourusername/gwalia-canteen-2.0/issues)

---

<div align="center">

Made with ❤️ for Nirma University

⭐ Star this repo if you find it helpful!

</div>