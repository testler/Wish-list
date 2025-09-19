(() => {
    'use strict';

    // App State
    let currentRoute = 'home';
    let searchQuery = '';
    let items = [];
    let categories = [];

    // Sample data matching the screenshots
    const sampleCategories = [
        {
            id: 'gaming-tech',
            name: 'Gaming & Tech',
            description: 'Gaming equipment, tech gadgets, and electronics for entertainment and productivity.',
            icon: '🎮',
            color: '#6366f1',
            giftNote: 'Perfect for birthdays - tech and gaming gear!',
            itemCount: 1,
            total: 25
        },
        {
            id: 'car-automotive',
            name: 'Car & Automotive',
            description: 'Car accessories, modifications, and automotive tools for vehicle improvements.',
            icon: '🚗',
            color: '#3b82f6',
            giftNote: 'Great practical gifts for car enthusiasts',
            itemCount: 1,
            total: 32
        },
        {
            id: 'workshop-tools',
            name: 'Workshop & Tools',
            description: 'Tools, organization, and workshop equipment for DIY projects and repairs.',
            icon: '🔧',
            color: '#8b5cf6',
            giftNote: 'Always useful for home improvement projects',
            itemCount: 3,
            total: 70
        },
        {
            id: 'creative-hobbies',
            name: 'Creative & Hobbies',
            description: 'Art supplies, craft materials, and hobby equipment for creative pursuits.',
            icon: '🎨',
            color: '#10b981',
            giftNote: 'Great for encouraging creativity',
            itemCount: 0,
            total: 0
        },
        {
            id: 'maker-diy',
            name: 'Maker & DIY',
            description: '3D printing, electronics, and maker supplies for building and creating things.',
            icon: '⚙️',
            color: '#f59e0b',
            giftNote: 'Fun for the tech-savvy maker',
            itemCount: 1,
            total: 10
        },
        {
            id: 'gardening-plants',
            name: 'Gardening & Plants',
            description: 'Garden tools, plants, and outdoor equipment for green-thumb enthusiasts.',
            icon: '🌱',
            color: '#059669',
            giftNote: 'Perfect for nature lovers',
            itemCount: 0,
            total: 0
        }
    ];

    const sampleItems = [
        {
            id: 'esd-work-mat',
            title: 'ESD Safe Work Mat',
            price: 29.00,
            category: 'workshop-tools',
            rank: 'S',
            vendor: 'Amazon',
            image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400',
            tracked: true,
            purchased: false,
            dateAdded: new Date().toISOString()
        },
        {
            id: 'gaming-headset',
            title: 'Wireless Gaming Headset',
            price: 25.00,
            category: 'gaming-tech',
            rank: 'A',
            vendor: 'Amazon',
            image: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=400',
            tracked: false,
            purchased: false,
            dateAdded: new Date().toISOString()
        },
        {
            id: 'car-organizer',
            title: 'Car Trunk Organizer',
            price: 32.00,
            category: 'car-automotive',
            rank: 'B',
            vendor: 'Amazon',
            image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400',
            tracked: true,
            purchased: false,
            dateAdded: new Date().toISOString()
        },
        {
            id: '3d-printer-filament',
            title: '3D Printer Filament PLA',
            price: 10.00,
            category: 'maker-diy',
            rank: 'B',
            vendor: 'Amazon',
            image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400',
            tracked: false,
            purchased: false,
            dateAdded: new Date().toISOString()
        },
        {
            id: 'usb-cable',
            title: 'USB-C Cable 6ft',
            price: 12.99,
            category: 'gaming-tech',
            rank: 'C',
            vendor: 'Amazon',
            image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
            tracked: false,
            purchased: false,
            dateAdded: new Date().toISOString()
        },
        {
            id: 'phone-stand',
            title: 'Adjustable Phone Stand',
            price: 15.99,
            category: 'gaming-tech',
            rank: 'B',
            vendor: 'Amazon',
            image: 'https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=400',
            tracked: true,
            purchased: false,
            dateAdded: new Date().toISOString()
        },
        {
            id: 'car-charger',
            title: 'Dual USB Car Charger',
            price: 8.99,
            category: 'car-automotive',
            rank: 'A',
            vendor: 'Amazon',
            image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
            tracked: false,
            purchased: false,
            dateAdded: new Date().toISOString()
        },
        {
            id: 'screwdriver-set',
            title: 'Mini Screwdriver Set',
            price: 18.50,
            category: 'workshop-tools',
            rank: 'A',
            vendor: 'Amazon',
            image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400',
            tracked: true,
            purchased: false,
            dateAdded: new Date().toISOString()
        }
    ];

    // DOM Elements
    const menuBtn = document.getElementById('menu-btn');
    const navOverlay = document.getElementById('nav-overlay');
    const closeNavBtn = document.querySelector('.close-nav');
    const navItems = document.querySelectorAll('.nav-item');
    const contentArea = document.getElementById('content-area');
    const searchInput = document.getElementById('global-search');
    const addItemBtn = document.getElementById('add-item-btn');
    const homeTitle = document.getElementById('home-title');

    // Initialize App
    function init() {
        loadData();
        bindEvents();
        initRouting();
        render();
    }

    // Initialize routing from URL
    function initRouting() {
        const urlParams = new URLSearchParams(window.location.search);
        const route = urlParams.get('route');
        if (route) {
            currentRoute = route;
        }

        // Set initial history state
        window.history.replaceState({ route: currentRoute }, '', window.location.href);

        // Listen for browser back/forward
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.route) {
                currentRoute = event.state.route;
                updateActiveNavItem();
                render();
            } else {
                // Fallback if no state
                const urlParams = new URLSearchParams(window.location.search);
                const route = urlParams.get('route') || 'home';
                currentRoute = route;
                updateActiveNavItem();
                render();
            }
        });
    }

    // Load data from localStorage or use sample data
    function loadData() {
        const savedItems = localStorage.getItem('wishlist-items');
        const savedCategories = localStorage.getItem('wishlist-categories');

        if (savedItems) {
            items = JSON.parse(savedItems);
        } else {
            items = [...sampleItems];
            saveData();
        }

        if (savedCategories) {
            categories = JSON.parse(savedCategories);
        } else {
            categories = [...sampleCategories];
            saveData();
        }
    }

    // Save data to localStorage
    function saveData() {
        localStorage.setItem('wishlist-items', JSON.stringify(items));
        localStorage.setItem('wishlist-categories', JSON.stringify(categories));
    }

    // Bind event listeners
    function bindEvents() {
        // Navigation
        menuBtn.addEventListener('click', toggleNav);
        closeNavBtn.addEventListener('click', closeNav);
        navOverlay.addEventListener('click', (e) => {
            if (e.target === navOverlay) closeNav();
        });

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const route = e.currentTarget.getAttribute('data-route');
                navigateTo(route);
                closeNav();
            });
        });

        // Search
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            render();
        });

        // Add item
        addItemBtn.addEventListener('click', () => {
            // TODO: Open add item modal
            console.log('Add item clicked');
        });

        // Home title click
        homeTitle.addEventListener('click', () => {
            navigateTo('home');
        });

        // Escape key to close nav
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !navOverlay.hasAttribute('hidden')) {
                closeNav();
            }
        });
    }

    // Navigation functions
    function toggleNav() {
        navOverlay.removeAttribute('hidden');
    }

    function closeNav() {
        navOverlay.setAttribute('hidden', '');
    }

    function navigateTo(route) {
        if (currentRoute === route) return; // Don't navigate to same route
        
        currentRoute = route;
        updateActiveNavItem();
        
        // Update URL and browser history
        const url = new URL(window.location);
        if (route === 'home') {
            url.searchParams.delete('route');
        } else {
            url.searchParams.set('route', route);
        }
        window.history.pushState({ route: route }, '', url.toString());
        
        render();
    }

    function goBack() {
        // Use browser's back functionality
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // Fallback to home if no history
            navigateTo('home');
        }
    }

    function updateActiveNavItem() {
        navItems.forEach(item => {
            const route = item.getAttribute('data-route');
            item.classList.toggle('is-active', route === currentRoute);
        });
    }

    // Main render function
    function render() {
        switch (currentRoute) {
            case 'home':
                renderHome();
                break;
            case 'under-20':
                renderUnder20();
                break;
            case '30-items':
                renderPriceRange(20, 30, '$30 Items', 'Great value gifts that hit the sweet spot');
                break;
            case 'by-rank':
                renderByPriority();
                break;
            case 'by-category':
                renderByCategory();
                break;
            case 'purchased':
                renderPurchased();
                break;
            default:
                renderHome();
                break;
        }
    }

    // Render home screen
    function renderHome() {
        const under20Count = items.filter(item => item.price <= 20 && !item.purchased).length;
        const thirtyItemsCount = items.filter(item => item.price > 20 && item.price <= 30 && !item.purchased).length;
        const rankCounts = {
            S: items.filter(item => item.rank === 'S').length,
            A: items.filter(item => item.rank === 'A').length,
            B: items.filter(item => item.rank === 'B').length,
            C: items.filter(item => item.rank === 'C').length
        };
        const categoryCount = categories.length;

        contentArea.innerHTML = `
            <div class="home-hero">
                <div class="hero-icon">🎁</div>
                <h1 class="hero-title">My Gift Wishlist</h1>
                <p class="hero-subtitle">Birthday & Christmas gift ideas, organized just for you!</p>
                <div class="hero-dates">
                    <div class="date-badge">🎂 Birthday: March 15th</div>
                    <div class="date-badge">🎄 Christmas Dreams</div>
                </div>
            </div>

            <div class="category-grid">
                <div class="category-card under-20" data-route="under-20">
                    <div class="category-header">
                        <div class="category-icon">$</div>
                        <div class="category-title">Under $20</div>
                    </div>
                    <div class="category-description">Perfect stocking stuffers and small gift ideas</div>
                    <div class="category-count">${under20Count} gift ideas</div>
                </div>

                <div class="category-card thirty-items" data-route="30-items">
                    <div class="category-header">
                        <div class="category-icon">🎯</div>
                        <div class="category-title">$30 Items</div>
                    </div>
                    <div class="category-description">Great value gifts that hit the sweet spot</div>
                    <div class="category-count">${thirtyItemsCount} gift ideas</div>
                </div>

                <div class="category-card by-priority" data-route="by-rank">
                    <div class="category-header">
                        <div class="category-icon">⭐</div>
                        <div class="category-title">By Priority</div>
                    </div>
                    <div class="category-description">See what I want most (S-tier = dream gifts!)</div>
                    <div class="category-pills">
                        <span class="priority-pill">S: ${rankCounts.S}</span>
                        <span class="priority-pill">A: ${rankCounts.A}</span>
                        <span class="priority-pill">B: ${rankCounts.B}</span>
                        <span class="priority-pill">C: ${rankCounts.C}</span>
                    </div>
                </div>

                <div class="category-card by-category" data-route="by-category">
                    <div class="category-header">
                        <div class="category-icon">📁</div>
                        <div class="category-title">By Category</div>
                    </div>
                    <div class="category-description">Browse gifts by my hobbies and interests</div>
                    <div class="category-count">${categoryCount} categories</div>
                </div>
            </div>
        `;

        // Add click handlers for category cards
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const route = e.currentTarget.getAttribute('data-route');
                if (route) {
                    navigateTo(route);
                }
            });
        });
    }

    // Render under $20 items
    function renderUnder20() {
        const filteredItems = items.filter(item => 
            item.price <= 20 && 
            !item.purchased &&
            (searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        contentArea.innerHTML = `
            <button class="back-button tooltip" data-tooltip="Go back" id="back-btn">
                ← Back
            </button>
            <div class="page-header">
                <h1 class="page-title">Under $20</h1>
                <p class="page-subtitle">Perfect stocking stuffers and small gift ideas</p>
            </div>
            ${renderItemGrid(filteredItems)}
        `;

        // Add back button event listener
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', goBack);
        }
    }

    // Render price range items
    function renderPriceRange(min, max, title, description) {
        const filteredItems = items.filter(item => 
            item.price > min && 
            item.price <= max && 
            !item.purchased &&
            (searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        contentArea.innerHTML = `
            <button class="back-button tooltip" data-tooltip="Go back" id="back-btn">
                ← Back
            </button>
            <div class="page-header">
                <h1 class="page-title">${title}</h1>
                <p class="page-subtitle">${description}</p>
            </div>
            ${renderItemGrid(filteredItems)}
        `;

        // Add back button event listener
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', goBack);
        }
    }

    // Render by priority view
    function renderByPriority() {
        const rankCounts = {
            S: items.filter(item => item.rank === 'S').length,
            A: items.filter(item => item.rank === 'A').length,
            B: items.filter(item => item.rank === 'B').length,
            C: items.filter(item => item.rank === 'C').length
        };

        let filteredItems = items.filter(item => 
            !item.purchased &&
            (searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        // Sort by rank priority (S > A > B > C)
        const rankOrder = { S: 4, A: 3, B: 2, C: 1 };
        filteredItems.sort((a, b) => (rankOrder[b.rank] || 0) - (rankOrder[a.rank] || 0));

        contentArea.innerHTML = `
            <button class="back-button tooltip" data-tooltip="Go back" id="back-btn">
                ← Back
            </button>
            <div class="priority-header">
                <h1 class="priority-title">By Priority</h1>
                <p class="priority-subtitle">Gift priority ranking</p>
            </div>
            
            <div class="priority-explanation">
                <p>S = Dream gifts | A = Really want | B = Would love | C = Nice to have</p>
            </div>

            <div class="tier-counts">
                <div class="tier-count">
                    <div class="tier-letter rank-S">S</div>
                    <div class="tier-number">${rankCounts.S}</div>
                </div>
                <div class="tier-count">
                    <div class="tier-letter rank-A">A</div>
                    <div class="tier-number">${rankCounts.A}</div>
                </div>
                <div class="tier-count">
                    <div class="tier-letter rank-B">B</div>
                    <div class="tier-number">${rankCounts.B}</div>
                </div>
                <div class="tier-count">
                    <div class="tier-letter rank-C">C</div>
                    <div class="tier-number">${rankCounts.C}</div>
                </div>
            </div>

            <div class="filter-tabs">
                <button class="filter-tab active" data-rank="all">All</button>
                <button class="filter-tab" data-rank="S">S Tier (${rankCounts.S})</button>
                <button class="filter-tab" data-rank="A">A Tier (${rankCounts.A})</button>
                <button class="filter-tab" data-rank="B">B Tier (${rankCounts.B})</button>
                <button class="filter-tab" data-rank="C">C Tier (${rankCounts.C})</button>
            </div>

            ${renderItemGrid(filteredItems)}
        `;

        // Add back button event listener
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', goBack);
        }

        // Add filter tab functionality
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const rank = e.target.getAttribute('data-rank');
                
                // Update active tab
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');

                // Filter items
                let filtered = items.filter(item => 
                    !item.purchased &&
                    (searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
                );

                if (rank !== 'all') {
                    filtered = filtered.filter(item => item.rank === rank);
                }

                filtered.sort((a, b) => (rankOrder[b.rank] || 0) - (rankOrder[a.rank] || 0));

                // Update grid
                const gridContainer = document.querySelector('.product-grid');
                if (gridContainer) {
                    gridContainer.innerHTML = renderItemCards(filtered);
                }
            });
        });
    }

    // Render by category view
    function renderByCategory() {
        contentArea.innerHTML = `
            <button class="back-button tooltip" data-tooltip="Go back" id="back-btn">
                ← Back
            </button>
            <div class="page-header">
                <h1 class="page-title">Gift Categories</h1>
                <p class="page-subtitle">Browse my wishlist by interests and hobbies</p>
            </div>

            <div class="category-grid">
                ${categories.map(category => `
                    <div class="category-card" style="background: linear-gradient(135deg, ${category.color}22, ${category.color}44);" data-category="${category.id}">
                        <div class="category-header">
                            <div class="category-icon">${category.icon}</div>
                            <div class="category-title">${category.name}</div>
                        </div>
                        <div class="category-description">${category.description}</div>
                        <div style="margin-top: 12px;">
                            <div style="color: rgba(255,255,255,0.8); font-size: 14px; margin-bottom: 4px;">Gift Note:</div>
                            <div style="color: rgba(255,255,255,0.9); font-weight: 600;">${category.giftNote}</div>
                        </div>
                        <div class="category-count" style="margin-top: 16px;">${category.itemCount} items</div>
                        <div style="color: rgba(255,255,255,0.7); font-size: 14px;">Total: $${category.total}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add back button event listener
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', goBack);
        }

        // Add click handlers
        document.querySelectorAll('.category-card[data-category]').forEach(card => {
            card.addEventListener('click', (e) => {
                const categoryId = e.currentTarget.getAttribute('data-category');
                const category = categories.find(c => c.id === categoryId);
                if (category) {
                    const categoryItems = items.filter(item => item.category === categoryId);
                    
                    contentArea.innerHTML = `
                        <button class="back-button tooltip" data-tooltip="Back to categories" id="back-to-categories">
                            ← Back to Categories
                        </button>
                        <div class="page-header">
                            <h1 class="page-title">${category.name}</h1>
                            <p class="page-subtitle">${category.description}</p>
                        </div>
                        ${renderItemGrid(categoryItems)}
                    `;

                    // Add back to categories event listener
                    const backToCategoriesBtn = document.getElementById('back-to-categories');
                    if (backToCategoriesBtn) {
                        backToCategoriesBtn.addEventListener('click', () => {
                            navigateTo('by-category');
                        });
                    }
                }
            });
        });
    }

    // Render purchased items
    function renderPurchased() {
        const purchasedItems = items.filter(item => 
            item.purchased &&
            (searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        contentArea.innerHTML = `
            <button class="back-button tooltip" data-tooltip="Go back" id="back-btn">
                ← Back
            </button>
            <div class="page-header">
                <h1 class="page-title">Purchased Items</h1>
                <p class="page-subtitle">Items that have been bought</p>
            </div>
            ${renderItemGrid(purchasedItems)}
        `;

        // Add back button event listener
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', goBack);
        }
    }

    // Render item grid
    function renderItemGrid(itemList) {
        if (itemList.length === 0) {
            return `
                <div class="text-center" style="padding: 40px 0; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                    <h3>No items found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            `;
        }

        return `
            <div class="product-grid">
                ${renderItemCards(itemList)}
            </div>
        `;
    }

    // Render individual item cards
    function renderItemCards(itemList) {
        return itemList.map(item => {
            const category = categories.find(c => c.id === item.category);
            
            return `
                <div class="product-card">
                    <div class="product-image">
                        ${item.image ? 
                            `<img src="${item.image}" alt="${item.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div class="placeholder" style="display: none;">📦</div>` :
                            `<div class="placeholder">📦</div>`
                        }
                        <div class="rank-badge rank-${item.rank} tooltip" data-tooltip="Priority: ${item.rank === 'S' ? 'Dream gift!' : item.rank === 'A' ? 'Really want' : item.rank === 'B' ? 'Would love' : 'Nice to have'}">${item.rank}</div>
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${item.title}</h3>
                        <div class="product-price">$${item.price.toFixed(2)}</div>
                        <div class="product-vendor">
                            <img class="vendor-icon" src="https://www.google.com/s2/favicons?sz=16&domain_url=amazon.com" alt="Amazon">
                            <span>${item.vendor}</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn btn-secondary tooltip" data-tooltip="Open Amazon link" onclick="openLink('${item.id}')">🔗</button>
                            <button class="btn ${item.tracked ? 'btn-primary' : 'btn-secondary'} tooltip" data-tooltip="${item.tracked ? 'Remove from tracked' : 'Track this item'}" onclick="toggleTrack('${item.id}')">
                                ${item.tracked ? '💖' : '🤍'}
                            </button>
                            <button class="btn-icon tooltip" data-tooltip="${item.purchased ? 'Mark as not purchased' : 'Mark as purchased'}" onclick="togglePurchased('${item.id}')">
                                ${item.purchased ? '✅' : '⭕'}
                            </button>
                            <button class="btn-icon tooltip" data-tooltip="More options" onclick="showMore('${item.id}')">⋯</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Item interaction functions
    window.openLink = (itemId) => {
        const item = items.find(i => i.id === itemId);
        if (item && item.url) {
            window.open(item.url, '_blank');
        } else {
            // Simulate Amazon link
            window.open('https://amazon.com', '_blank');
        }
    };

    window.toggleTrack = (itemId) => {
        const item = items.find(i => i.id === itemId);
        if (item) {
            item.tracked = !item.tracked;
            saveData();
            render();
        }
    };

    window.togglePurchased = (itemId) => {
        const item = items.find(i => i.id === itemId);
        if (item) {
            item.purchased = !item.purchased;
            saveData();
            render();
        }
    };

    window.showMore = (itemId) => {
        // TODO: Show more options modal
        console.log('Show more options for item:', itemId);
    };

    // Make functions globally available
    window.navigateTo = navigateTo;
    window.goBack = goBack;

    // Initialize app when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
