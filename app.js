// Configuration - JSONBin credentials
const CONFIG = {
    BIN_ID: "68bd0199ae596e708fe558a8",
    API_KEY: "$2a$10$qCWunkuQ.RvrVSMrdAzXA.h.BWSmvB6NkAIaEXVd5rUQ7E4RzwCyq",
    BASE_URL: "https://api.jsonbin.io/v3/b"
};

// Get the full API URL
const getBinUrl = () => `${CONFIG.BASE_URL}/${CONFIG.BIN_ID}`;

// Global state
let wishlistItems = [];
let currentSort = 'most-wanted';

// DOM Elements
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const wishlistContainer = document.getElementById('wishlist');
const sortSelect = document.getElementById('sort-select');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    console.log('Initializing wishlist app...');
    
    // Setup event listeners
    setupEventListeners();
    
    // Load wishlist data
    await loadWishlist();
}

function setupEventListeners() {
    // Sort dropdown change
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderWishlist();
    });
    
    // Explore button
    document.querySelector('.explore-btn').addEventListener('click', () => {
        openExploreModal();
    });
}

// Fetch wishlist data from JSONBin
async function fetchWishlist() {
    if (!CONFIG.BIN_ID || CONFIG.BIN_ID === "YOUR_BIN_ID") {
        throw new Error('JSONBin configuration not set. Please update BIN_ID and API_KEY in app.js');
    }
    
    const response = await fetch(`${getBinUrl()}/latest`, {
        method: 'GET',
        headers: {
            'X-Access-Key': CONFIG.API_KEY,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch wishlist: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.record.items || [];
}

// Load and display wishlist
async function loadWishlist() {
    try {
        showLoading();
        
        // For demo purposes, if JSONBin is not configured, use sample data
        if (!CONFIG.BIN_ID || CONFIG.BIN_ID === "YOUR_BIN_ID") {
            console.warn('Using sample data. Configure JSONBin for live data.');
            wishlistItems = getSampleData();
        } else {
            wishlistItems = await fetchWishlist();
        }
        
        hideLoading();
        renderWishlist();
        
    } catch (error) {
        console.error('Error loading wishlist:', error);
        showError(error.message);
    }
}

// Sample data for demo
function getSampleData() {
    return [
        {
            id: "phone-mount",
            title: "Custom Phone Mount",
            category: "Tesla Upgrades",
            status: "available",
            price: 39.99,
            priority: 1,
            dateAdded: "2024-01-15",
            icon: "📱",
            brand: "MagSafe",
            links: [
                { label: "Buy at Amazon", url: "https://amazon.com", type: "primary" },
                { label: "Manufacturer", url: "https://example.com", type: "secondary" }
            ]
        },
        {
            id: "heat-break",
            title: "Bi-Metal Heat Break",
            category: "3D Printing Gear",
            status: "claimed",
            price: 15.00,
            priority: 2,
            dateAdded: "2024-01-10",
            icon: "🔧",
            links: [
                { label: "Local Store", url: "https://example.com", type: "secondary" }
            ]
        },
        {
            id: "controller-dock",
            title: "Controller Charging Dock",
            category: "Gaming & Couch Setup",
            status: "available",
            price: 29.99,
            priority: 3,
            dateAdded: "2024-01-12",
            icon: "🎮",
            brand: "Available",
            links: [
                { label: "Buy at Manufacturer", url: "https://example.com", type: "primary" }
            ]
        },
        {
            id: "strawberries",
            title: "Flavorfest Strawberries",
            category: "Garden & Orchard Tools",
            status: "available",
            priority: 4,
            dateAdded: "2024-01-08",
            icon: "🍓",
            contribution: {
                target: 150,
                raised: 60
            },
            links: [
                { label: "Contribute", url: "https://example.com", type: "primary" }
            ]
        },
        {
            id: "led-panels",
            title: "Smart LED Panels",
            category: "Home Automation",
            status: "available",
            price: 199.99,
            priority: 5,
            dateAdded: "2024-01-05",
            icon: "💡",
            links: [
                { label: "Buy at Amazon", url: "https://amazon.com", type: "primary" },
                { label: "Compare Prices", url: "https://example.com", type: "secondary" }
            ]
        },
        {
            id: "mechanical-keyboard",
            title: "Custom Mechanical Keyboard",
            category: "Tech & Electronics",
            status: "available",
            price: 159.99,
            priority: 6,
            dateAdded: "2024-01-03",
            icon: "⌨️",
            links: [
                { label: "Buy Direct", url: "https://example.com", type: "primary" }
            ]
        },
        {
            id: "coffee-grinder",
            title: "Burr Coffee Grinder",
            category: "Kitchen & Cooking",
            status: "available",
            price: 89.99,
            priority: 7,
            dateAdded: "2024-01-01",
            icon: "☕",
            contribution: {
                target: 90,
                raised: 25
            },
            links: [
                { label: "Contribute", url: "https://example.com", type: "primary" }
            ]
        }
    ];
}

// Render the wishlist
function renderWishlist() {
    const sortedItems = sortItems([...wishlistItems], currentSort);
    
    wishlistContainer.innerHTML = '';
    
    if (sortedItems.length === 0) {
        wishlistContainer.innerHTML = `
            <div style="text-align: center; padding: 48px; color: var(--text-secondary);">
                <p>No wishlist items found.</p>
            </div>
        `;
        return;
    }
    
    sortedItems.forEach(item => {
        const itemElement = createItemElement(item);
        wishlistContainer.appendChild(itemElement);
    });
}

// Create HTML element for a wishlist item
function createItemElement(item) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'wishlist-item';
    itemDiv.dataset.itemId = item.id;
    
    // Status badge
    const statusClass = `status-${item.status}`;
    const statusText = item.status.charAt(0).toUpperCase() + item.status.slice(1);
    
    // Price or contribution section
    let priceSection = '';
    if (item.contribution) {
        const percentage = Math.round((item.contribution.raised / item.contribution.target) * 100);
        priceSection = `
            <div class="contribution-section">
                <div class="contribution-info">
                    <span class="contribution-amount">$${item.contribution.raised} raised</span>
                    <span class="contribution-target">of ${item.contribution.target}</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="progress-percentage">${percentage}%</div>
                </div>
            </div>
        `;
    } else if (item.price) {
        priceSection = `<div class="item-price">$${item.price.toFixed(2)}</div>`;
    }
    
    // Brand or status info
    const brandInfo = item.brand ? `<div class="item-brand">${item.brand}</div>` : '';
    
    // Links section
    const linksHtml = item.links.map(link => {
        const linkClass = link.type === 'primary' ? 'item-link primary' : 'item-link secondary';
        return `<a href="${link.url}" class="${linkClass}" target="_blank" rel="noopener noreferrer">${link.label}</a>`;
    }).join('');
    
    // Action buttons (only for available items)
    let actionsHtml = '';
    if (item.status === 'available') {
        actionsHtml = `
            <div class="item-actions">
                <button class="action-btn" onclick="claimItem('${item.id}')">Claim Item</button>
                <button class="action-btn" onclick="markPurchased('${item.id}')">Mark Purchased</button>
            </div>
        `;
    }
    
    itemDiv.innerHTML = `
        <div class="item-image">
            ${item.icon || '📦'}
        </div>
        <div class="item-content">
            <div class="item-header">
                <div class="item-info">
                    <h3>${item.title}</h3>
                    <div class="item-category">${item.category}</div>
                </div>
                <div class="status-badge ${statusClass}">${statusText}</div>
            </div>
            ${brandInfo}
            ${priceSection}
            ${actionsHtml}
        </div>
        <div class="item-actions-section">
            <div class="item-links">
                ${linksHtml}
            </div>
        </div>
    `;
    
    return itemDiv;
}

// Sort items based on selected criteria
function sortItems(items, sortType) {
    switch (sortType) {
        case 'most-wanted':
            return items.sort((a, b) => {
                // Priority first, then contribution percentage remaining, then recency
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                
                // If both have contributions, sort by percentage remaining (less funded first)
                if (a.contribution && b.contribution) {
                    const aPercent = (a.contribution.raised / a.contribution.target) * 100;
                    const bPercent = (b.contribution.raised / b.contribution.target) * 100;
                    return aPercent - bPercent;
                }
                
                // Finally sort by date added (newer first)
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            });
            
        case 'price-low':
            return items.sort((a, b) => {
                const aPrice = a.price || (a.contribution ? a.contribution.target : 0);
                const bPrice = b.price || (b.contribution ? b.contribution.target : 0);
                return aPrice - bPrice;
            });
            
        case 'price-high':
            return items.sort((a, b) => {
                const aPrice = a.price || (a.contribution ? a.contribution.target : 0);
                const bPrice = b.price || (b.contribution ? b.contribution.target : 0);
                return bPrice - aPrice;
            });
            
        case 'category':
            return items.sort((a, b) => a.category.localeCompare(b.category));
            
        case 'recently-added':
            return items.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
            
        default:
            return items;
    }
}

// Claim an item
async function claimItem(itemId) {
    try {
        const item = wishlistItems.find(i => i.id === itemId);
        if (!item) return;
        
        if (confirm(`Are you sure you want to claim "${item.title}"?`)) {
            item.status = 'claimed';
            await saveWishlist();
            renderWishlist();
        }
    } catch (error) {
        console.error('Error claiming item:', error);
        alert('Failed to claim item. Please try again.');
    }
}

// Mark item as purchased
async function markPurchased(itemId) {
    try {
        const item = wishlistItems.find(i => i.id === itemId);
        if (!item) return;
        
        if (confirm(`Mark "${item.title}" as purchased?`)) {
            item.status = 'purchased';
            await saveWishlist();
            renderWishlist();
        }
    } catch (error) {
        console.error('Error marking item as purchased:', error);
        alert('Failed to update item. Please try again.');
    }
}

// Save wishlist to JSONBin
async function saveWishlist() {
    if (!CONFIG.BIN_ID || CONFIG.BIN_ID === "YOUR_BIN_ID") {
        console.warn('JSONBin not configured. Changes will not be saved.');
        return;
    }
    
    const response = await fetch(getBinUrl(), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Access-Key': CONFIG.API_KEY
        },
        body: JSON.stringify({ items: wishlistItems })
    });
    
    if (!response.ok) {
        throw new Error(`Failed to save wishlist: ${response.status} ${response.statusText}`);
    }
    
    console.log('Wishlist saved successfully');
}

// UI State Management
function showLoading() {
    loadingElement.style.display = 'block';
    errorElement.style.display = 'none';
    wishlistContainer.style.display = 'none';
}

function hideLoading() {
    loadingElement.style.display = 'none';
    wishlistContainer.style.display = 'grid';
}

function showError(message) {
    loadingElement.style.display = 'none';
    errorElement.style.display = 'block';
    wishlistContainer.style.display = 'none';
    
    const errorMessage = errorElement.querySelector('p');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

// Explore by Interests Modal Functions
let currentExploreFilter = 'all';

function openExploreModal() {
    const modal = document.getElementById('explore-modal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Setup filter event listeners
    setupExploreFilters();
    
    // Render initial content
    renderExploreContent();
    
    // Close on escape key
    document.addEventListener('keydown', handleEscapeKey);
}

function closeExploreModal() {
    const modal = document.getElementById('explore-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.removeEventListener('keydown', handleEscapeKey);
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeExploreModal();
    }
}

function setupExploreFilters() {
    const filters = document.querySelectorAll('.interest-filter');
    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            // Remove active class from all filters
            filters.forEach(f => f.classList.remove('active'));
            
            // Add active class to clicked filter
            filter.classList.add('active');
            
            // Update current filter
            currentExploreFilter = filter.dataset.category;
            
            // Re-render content
            renderExploreContent();
        });
    });
}

function renderExploreContent() {
    renderExploreStats();
    renderCategoriesGrid();
    renderFilteredItems();
}

function renderExploreStats() {
    const totalItems = wishlistItems.length;
    const availableItems = wishlistItems.filter(item => item.status === 'available').length;
    const totalValue = wishlistItems.reduce((sum, item) => {
        if (item.price) return sum + item.price;
        if (item.contribution) return sum + item.contribution.target;
        return sum;
    }, 0);
    
    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('available-items').textContent = availableItems;
    document.getElementById('total-value').textContent = `$${totalValue.toFixed(0)}`;
}

function renderCategoriesGrid() {
    const categoriesContainer = document.getElementById('explore-categories');
    
    // Group items by category
    const categoryGroups = {};
    wishlistItems.forEach(item => {
        if (!categoryGroups[item.category]) {
            categoryGroups[item.category] = [];
        }
        categoryGroups[item.category].push(item);
    });
    
    // Category icons mapping
    const categoryIcons = {
        'Tesla Upgrades': '🚗',
        '3D Printing Gear': '🖨️',
        'Gaming & Couch Setup': '🎮',
        'Garden & Orchard Tools': '🌱',
        'Home Automation': '🏠',
        'Tech & Electronics': '💻',
        'Kitchen & Cooking': '👨‍🍳',
        'Fitness & Health': '💪'
    };
    
    // Create category cards
    const categoryCards = Object.entries(categoryGroups).map(([category, items]) => {
        const availableCount = items.filter(item => item.status === 'available').length;
        const icon = categoryIcons[category] || '📦';
        
        return `
            <div class="category-card" onclick="filterByCategory('${category}')">
                <span class="category-icon">${icon}</span>
                <div class="category-name">${category}</div>
                <div class="category-count">${items.length} items (${availableCount} available)</div>
            </div>
        `;
    }).join('');
    
    categoriesContainer.innerHTML = categoryCards;
}

function renderFilteredItems() {
    const itemsContainer = document.getElementById('explore-items');
    
    // Filter items based on current selection
    let filteredItems = wishlistItems;
    if (currentExploreFilter !== 'all') {
        filteredItems = wishlistItems.filter(item => item.category === currentExploreFilter);
    }
    
    // Sort filtered items by priority
    filteredItems = sortItems([...filteredItems], 'most-wanted');
    
    // Create item elements
    itemsContainer.innerHTML = '';
    filteredItems.forEach(item => {
        const itemElement = createItemElement(item);
        itemsContainer.appendChild(itemElement);
    });
    
    // Show message if no items
    if (filteredItems.length === 0) {
        itemsContainer.innerHTML = `
            <div style="text-align: center; padding: 48px; color: var(--text-secondary); grid-column: 1/-1;">
                <p>No items found in this category.</p>
            </div>
        `;
    }
}

function filterByCategory(category) {
    // Update filter buttons
    const filters = document.querySelectorAll('.interest-filter');
    filters.forEach(filter => {
        filter.classList.remove('active');
        if (filter.dataset.category === category) {
            filter.classList.add('active');
        }
    });
    
    // Update current filter
    currentExploreFilter = category;
    
    // Re-render content
    renderExploreContent();
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('explore-modal');
    if (e.target === modal) {
        closeExploreModal();
    }
});

// Make functions globally available for onclick handlers
window.claimItem = claimItem;
window.markPurchased = markPurchased;
window.loadWishlist = loadWishlist;
window.closeExploreModal = closeExploreModal;
window.filterByCategory = filterByCategory;
