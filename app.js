(() => {
    'use strict';

    // App State
    let currentRoute = 'home';
    let searchQuery = '';
    let items = [];
    let projects = [];

    // Remote data source (JSONBin)
    // Set one of these to your JSONBin endpoint(s). If JSONBIN_URL is provided, it should
    // return an object with shape: { items: Item[], projects: Project[] }
    // If you prefer separate bins, set JSONBIN_ITEMS_URL and/or JSONBIN_PROJECTS_URL instead.
    const JSONBIN_URL = 'https://api.jsonbin.io/v3/b/68bd0199ae596e708fe558a8/latest';
    const JSONBIN_ITEMS_URL = '';
    const JSONBIN_PROJECTS_URL = '';
    const JSONBIN_KEY = '$2a$10$qCWunkuQ.RvrVSMrdAzXA.h.BWSmvB6NkAIaEXVd5rUQ7E4RzwCyq'; // X-Access-Key for JSONBin

    // No local samples – data will be fetched from JSONBin or loaded from localStorage

    function readLocal() {
        try {
            const ii = JSON.parse(localStorage.getItem('wishlist-items') || '[]');
            const pp = JSON.parse(localStorage.getItem('wishlist-projects') || '[]');
            return { items: Array.isArray(ii) ? ii : [], projects: Array.isArray(pp) ? pp : [] };
        } catch {
            return { items: [], projects: [] };
        }
    }

    // No local sample items – will be fetched

    // DOM Elements
    const menuBtn = document.getElementById('menu-btn');
    const navOverlay = document.getElementById('nav-overlay');
    const closeNavBtn = document.querySelector('.close-nav');
    const navItems = document.querySelectorAll('.nav-item');
    const contentArea = document.getElementById('content-area');
    const searchInput = document.getElementById('global-search');
    const purchaseModal = document.getElementById('purchase-modal');
    const purchaseModalClose = document.getElementById('purchase-modal-close');
    const purchaseCancel = document.getElementById('purchase-cancel');
    const purchaseConfirm = document.getElementById('purchase-confirm');
    let itemToPurchase = null;
    const homeTitle = document.getElementById('home-title');

    // Initialize App
    async function init() {
        await loadData();
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

    // Load data ALWAYS from JSONBin first, then cache locally
    async function loadData() {
        try {
            const headers = {
                'X-Access-Key': JSONBIN_KEY
            };
            console.log('Fetching from JSONBin...', JSONBIN_URL);
            console.log('Using headers:', headers);
            
            const res = await fetch(JSONBIN_URL, { headers });
            console.log('Response status:', res.status, res.statusText);
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            const raw = await res.json();
            console.log('JSONBin response:', raw);
            
            // JSONBin v3 wraps payload in { record: {...} }
            const data = raw && raw.record ? raw.record : raw;
            items = Array.isArray(data.items) ? data.items : [];
            projects = Array.isArray(data.projects) ? data.projects : [];
            
            console.log(`Loaded ${items.length} items and ${projects.length} projects from JSONBin`);
                await saveData();
        } catch (e) {
            console.error('Failed to fetch JSONBin data:', e);
            // Fallback to cached data only if JSONBin fails
            const saved = readLocal();
            items = saved.items;
            projects = saved.projects;
            console.log(`Fallback: using cached ${items.length} items and ${projects.length} projects`);
        }
    }

    // Save data to localStorage
    function saveData() {
        localStorage.setItem('wishlist-items', JSON.stringify(items));
        localStorage.setItem('wishlist-projects', JSON.stringify(projects));
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

        // Purchase modal
        purchaseModalClose.addEventListener('click', closePurchaseModal);
        purchaseCancel.addEventListener('click', closePurchaseModal);
        purchaseConfirm.addEventListener('click', confirmPurchase);
        purchaseModal.addEventListener('click', (e) => {
            if (e.target === purchaseModal) closePurchaseModal();
        });

        // Home title click
        homeTitle.addEventListener('click', () => {
            navigateTo('home');
        });

        // Escape key to close nav and modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!navOverlay.hasAttribute('hidden')) {
                    closeNav();
                } else if (!purchaseModal.hasAttribute('hidden')) {
                    closePurchaseModal();
                }
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
        console.log(`navigateTo called with route: ${route}, current route: ${currentRoute}`);
        
        if (currentRoute === route) {
            console.log('Same route, skipping navigation');
            return; // Don't navigate to same route
        }
        
        currentRoute = route;
        console.log(`Route changed to: ${currentRoute}`);
        updateActiveNavItem();
        
        // Update URL and browser history
        const url = new URL(window.location);
        if (route === 'home') {
            url.searchParams.delete('route');
                    } else {
            url.searchParams.set('route', route);
        }
        window.history.pushState({ route: route }, '', url.toString());
        
        console.log('About to render...');
        render();
        console.log('Render complete');
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

    // Purchase modal functions
    function openPurchaseModal(itemId) {
        const item = items.find(i => i.id === itemId);
        if (item) {
            itemToPurchase = itemId;
            document.getElementById('purchase-confirm-text').textContent = 
                `Are you sure you want to mark "${item.title}" as purchased? This will remove it from your wishlist.`;
            purchaseModal.removeAttribute('hidden');
            purchaseModal.setAttribute('aria-hidden', 'false');
        }
    }

    function closePurchaseModal() {
        purchaseModal.setAttribute('hidden', 'true');
        purchaseModal.setAttribute('aria-hidden', 'true');
        itemToPurchase = null;
    }

    async function confirmPurchase() {
        if (itemToPurchase) {
            const item = items.find(i => i.id === itemToPurchase);
            if (item) {
                // Mark as purchased and save to JSONBin
                item.purchased = true;
                try {
                    await updateJSONBin();
                    closePurchaseModal();
            render();
                    toast(`"${item.title}" marked as purchased!`);
                } catch (error) {
                    console.error('Failed to update JSONBin:', error);
                    toast('Failed to update. Please try again.');
                }
            }
        }
    }

    // Update JSONBin with current data
    async function updateJSONBin() {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-Access-Key': JSONBIN_KEY
            };
            
            const payload = { items, projects };
            console.log('Updating JSONBin with payload:', payload);
            
            // Use base URL without /latest for updates
            const updateUrl = JSONBIN_URL.replace('/latest', '');
            
            const res = await fetch(updateUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });
            
            console.log('Update response status:', res.status, res.statusText);
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            await saveData(); // Also update local cache
            console.log('JSONBin updated successfully');
        } catch (error) {
            console.error('Failed to update JSONBin:', error);
            throw error;
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
            case 'by-project':
                renderByProject();
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
        const projectCount = projects.length;

        contentArea.innerHTML = `
            <div class="home-hero">
                <div class="hero-icon">🎁</div>
                <h1 class="hero-title">My Gift Wishlist</h1>
                <p class="hero-subtitle">Birthday & Christmas gift ideas, organized just for you!</p>
                <div class="hero-dates">
                    <div class="date-badge">🎂 Birthday: September 22nd</div>
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

                <div class="category-card by-category" data-route="by-project">
                    <div class="category-header">
                        <div class="category-icon">📁</div>
                        <div class="category-title">By Project</div>
                    </div>
                    <div class="category-description">Browse my wishlist by projects and goals</div>
                    <div class="category-count">${projectCount} projects</div>
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
        let filteredItems = items.filter(item => 
            item.price <= 20 && 
            (searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        
        // Sort to put purchased items at the bottom
        filteredItems.sort((a, b) => {
            if (a.purchased && !b.purchased) return 1;
            if (!a.purchased && b.purchased) return -1;
            return 0;
        });

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
        let filteredItems = items.filter(item => 
            item.price > min && 
            item.price <= max && 
            (searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        
        // Sort to put purchased items at the bottom
        filteredItems.sort((a, b) => {
            if (a.purchased && !b.purchased) return 1;
            if (!a.purchased && b.purchased) return -1;
            return 0;
        });

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
            (searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        // Sort by rank priority (S > A > B > C), then put purchased items at bottom
        const rankOrder = { S: 4, A: 3, B: 2, C: 1 };
        filteredItems.sort((a, b) => {
            // First sort by purchased status (purchased items go to bottom)
            if (a.purchased && !b.purchased) return 1;
            if (!a.purchased && b.purchased) return -1;
            // Then sort by rank priority
            return (rankOrder[b.rank] || 0) - (rankOrder[a.rank] || 0);
        });

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
                    (searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
                );

                if (rank !== 'all') {
                    filtered = filtered.filter(item => item.rank === rank);
                }

                // Sort by rank priority, then put purchased items at bottom
                filtered.sort((a, b) => {
                    // First sort by purchased status (purchased items go to bottom)
                    if (a.purchased && !b.purchased) return 1;
                    if (!a.purchased && b.purchased) return -1;
                    // Then sort by rank priority
                    return (rankOrder[b.rank] || 0) - (rankOrder[a.rank] || 0);
                });

                // Update grid
                const gridContainer = document.querySelector('.product-grid');
                if (gridContainer) {
                    gridContainer.innerHTML = renderItemCards(filtered);
                }
            });
        });
    }

    // Render by project view
    function renderByProject() {
        contentArea.innerHTML = `
            <button class="back-button tooltip" data-tooltip="Go back" id="back-btn">
                ← Back
            </button>
            <div class="page-header">
                <h1 class="page-title">Projects</h1>
                <p class="page-subtitle">Browse my wishlist by projects and goals</p>
            </div>

            <div class="category-grid">
                ${projects.map(project => {
                    // Calculate actual item count for this project
                    const actualItemCount = items.filter(item => item.project === project.id && !item.purchased).length;
                    
                    return `
                    <div class="category-card" style="background: linear-gradient(135deg, ${project.color}22, ${project.color}44), url('${project.coverImage || ''}') center/cover no-repeat;" data-project="${project.id}">
                        <div class="category-header">
                            <div class="category-icon">${project.icon}</div>
                            <div class="category-title">${project.name}</div>
                        </div>
                        <div class="category-description">${project.description}</div>
                        <div style="margin-top: 12px;">
                            <div style="color: rgba(255,255,255,0.8); font-size: 14px; margin-bottom: 4px;">Gift Note:</div>
                            <div style="color: rgba(255,255,255,0.9); font-weight: 600;">${project.giftNote || 'No gift note available'}</div>
                        </div>
                        <div class="category-count" style="margin-top: 16px;">${actualItemCount} items</div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;

        // Add back button event listener
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', goBack);
        }

        // Add click handlers
        document.querySelectorAll('.category-card[data-project]').forEach(card => {
            card.addEventListener('click', (e) => {
                const projectId = e.currentTarget.getAttribute('data-project');
                const project = projects.find(p => p.id === projectId);
                if (project) {
                    let projectItems = items.filter(item => item.project === projectId);
                    
                    // Sort to put purchased items at the bottom
                    projectItems.sort((a, b) => {
                        if (a.purchased && !b.purchased) return 1;
                        if (!a.purchased && b.purchased) return -1;
                        return 0;
                    });
                    
                    contentArea.innerHTML = `
                        <button class="back-button tooltip" data-tooltip="Back to projects" id="back-to-projects">
                            ← Back to Projects
                        </button>
                        <div class="page-header">
                            <h1 class="page-title">${project.name}</h1>
                            <p class="page-subtitle">${project.description}</p>
                        </div>
                        ${renderItemGrid(projectItems)}
                    `;

                    // Add back to projects event listener
                    setTimeout(() => {
                        const backToProjectsBtn = document.getElementById('back-to-projects');
                        if (backToProjectsBtn) {
                            // Remove any existing listeners first
                            backToProjectsBtn.replaceWith(backToProjectsBtn.cloneNode(true));
                            const newBtn = document.getElementById('back-to-projects');
                            newBtn.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Back to projects clicked - rendering project list');
                                renderByProject();
                            });
    } else {
                            console.error('Back to projects button not found');
                        }
                    }, 0);
                }
            });
        });
    }

    // Render purchased items
    function renderPurchased() {
        let purchasedItems = items.filter(item => 
            item.purchased &&
            (searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        
        // Sort by date purchased (most recent first) or by rank if no date
        const rankOrder = { S: 4, A: 3, B: 2, C: 1 };
        purchasedItems.sort((a, b) => {
            // If we had purchase dates, we could sort by those
            // For now, sort by rank priority
            return (rankOrder[b.rank] || 0) - (rankOrder[a.rank] || 0);
        });

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
            const project = projects.find(p => p.id === item.project);
            const isPurchased = item.purchased;
            
            return `
                <div class="product-card${isPurchased ? ' purchased' : ''}">
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
                            <button class="btn btn-secondary tooltip" data-tooltip="Open link" onclick="openLink('${item.id}')">🔗</button>
                            ${isPurchased ? 
                                `<button class="btn btn-purchased tooltip" data-tooltip="Already purchased" disabled>Purchased</button>` :
                                `<button class="btn btn-primary tooltip" data-tooltip="Mark as purchased" onclick="openPurchaseModal('${item.id}')">Mark as purchased</button>`
                            }
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

    // Removed tracked feature

    // Add toast function
    function toast(message) {
        const toastStack = document.getElementById('toast-stack');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastStack.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Make functions globally available
    window.navigateTo = navigateTo;
    window.goBack = goBack;
    window.openPurchaseModal = openPurchaseModal;

    // Initialize app when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
