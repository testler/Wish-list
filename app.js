(() => {
    'use strict';

    // App State
    let currentRoute = 'home';
    let searchQuery = '';
    let items = [];
    let projects = [];
    let isAdmin = false;
    let adminSection = 'items'; // or 'projects'
    let secretTapCount = 0;
    let lastSecretTapTs = 0;

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

    // Admin: login screen
    function renderAdminLogin() {
        contentArea.innerHTML = `
            <div class="admin-login-card">
                <div class="admin-login-icon">🔒</div>
                <h2 class="admin-login-title">Admin Access</h2>
                <p class="admin-login-subtitle">Enter your password to manage the wishlist</p>
                <div class="form-group">
                    <label class="form-label" for="admin-pass">Password</label>
                    <div class="admin-pass-wrap">
                        <input id="admin-pass" type="password" class="form-input" placeholder="••••••" />
                    </div>
                    <div id="admin-error" class="admin-error hidden">Invalid password</div>
                </div>
                <button id="admin-login-btn" class="btn btn-primary btn-block">Login to Admin</button>
            </div>
        `;

        const passInput = document.getElementById('admin-pass');
        const loginBtn = document.getElementById('admin-login-btn');
        const errorEl = document.getElementById('admin-error');

        function tryLogin() {
            const val = (passInput.value || '').trim();
            if (val.toLowerCase() === 'secrect') { // per request exact word
                isAdmin = true;
                localStorage.setItem('wishlist-admin', 'true');
                navigateTo('admin');
            } else {
                errorEl.classList.remove('hidden');
            }
        }

        loginBtn.addEventListener('click', tryLogin);
        passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
    }

    // Admin: dashboard
    function renderAdminDashboard() {
        contentArea.innerHTML = `
            <div class="admin-header">
                <h1 class="page-title">Admin Dashboard</h1>
                <button id="admin-logout" class="btn btn-secondary">Logout</button>
            </div>

            <div class="admin-tabs">
                <button class="admin-tab ${adminSection === 'items' ? 'active' : ''}" data-tab="items">Manage Items</button>
                <button class="admin-tab ${adminSection === 'projects' ? 'active' : ''}" data-tab="projects">Manage Projects</button>
            </div>

            <div class="admin-section">
                ${adminSection === 'items' ? renderAdminItems() : renderAdminProjects()}
            </div>
        `;

        document.getElementById('admin-logout').addEventListener('click', () => {
            isAdmin = false;
            localStorage.removeItem('wishlist-admin');
            navigateTo('home');
        });

        document.querySelectorAll('.admin-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                adminSection = btn.getAttribute('data-tab');
                renderAdminDashboard();
            });
        });
        // Wire item add
        const addItemBtn = document.getElementById('add-item');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', async () => {
                const title = document.getElementById('new-name').value.trim();
                const price = parseFloat(document.getElementById('new-price').value || '0');
                const description = document.getElementById('new-desc').value.trim();
                const image = document.getElementById('new-image').value.trim();
                const rank = (document.getElementById('new-rank').value || 'A').toUpperCase();
                const project = document.getElementById('new-project').value;
                const vendor = document.getElementById('new-vendor').value.trim();
                const link = document.getElementById('new-link').value.trim();
                const purchased = document.getElementById('new-purchased').checked;

                if (!title) return toast('Name is required');

                const newItem = {
                    id: `item-${Date.now()}`,
                    title,
                    price: isNaN(price) ? 0 : price,
                    description,
                    image,
                    rank,
                    project,
                    vendor,
                    url: link,
                    purchased
                };
                items.push(newItem);
                try {
                    await updateJSONBin();
                    toast('Item added');
                    renderAdminDashboard();
                } catch {
                    toast('Failed to save');
                }
            });
        }

        // Wire edit/delete for items
        document.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = Number(btn.getAttribute('data-del'));
                items.splice(idx, 1);
                try { await updateJSONBin(); toast('Item deleted'); renderAdminDashboard(); } catch { toast('Failed to delete'); }
            });
        });

        document.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.getAttribute('data-edit'));
                openItemEdit(idx);
            });
        });

        // Wire project add
        const addProjectBtn = document.getElementById('add-project');
        if (addProjectBtn) {
            addProjectBtn.addEventListener('click', async () => {
                const name = document.getElementById('proj-name').value.trim();
                const description = document.getElementById('proj-desc').value.trim();
                const icon = document.getElementById('proj-icon').value.trim() || '📁';
                const color = document.getElementById('proj-color').value.trim() || '#f97316';
                const projectIconImage = document.getElementById('proj-image').value.trim();
                if (!name) return toast('Project name is required');
                projects.push({ id: name.toLowerCase().replace(/\s+/g, '-'), name, description, icon, color, ['project-icon-image']: projectIconImage });
                try { await updateJSONBin(); toast('Project added'); renderAdminDashboard(); } catch { toast('Failed to save'); }
            });
        }

        // Wire edit/delete for projects
        document.querySelectorAll('[data-del-proj]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = Number(btn.getAttribute('data-del-proj'));
                projects.splice(idx, 1);
                try { await updateJSONBin(); toast('Project deleted'); renderAdminDashboard(); } catch { toast('Failed to delete'); }
            });
        });

        document.querySelectorAll('[data-edit-proj]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.getAttribute('data-edit-proj'));
                openProjectEdit(idx);
            });
        });
    }

    function openItemEdit(index) {
        const it = items[index];
        if (!it) return;
        const overlay = document.createElement('div');
        overlay.className = 'modal';
        overlay.innerHTML = `
            <div class="modal-dialog">
                <header class="modal-header">
                    <h2 class="modal-title">Edit Item</h2>
                    <button class="modal-close" id="edit-close">×</button>
                </header>
                <div class="modal-body">
                    <div class="form-group"><label class="form-label">Name</label><input id="e-name" class="form-input" value="${it.title}" /></div>
                    <div class="form-group"><label class="form-label">Price</label><input id="e-price" type="number" step="0.01" class="form-input" value="${Number(it.price || 0)}" /></div>
                    <div class="form-group"><label class="form-label">Rank</label><input id="e-rank" class="form-input" value="${it.rank || 'A'}" /></div>
                    <div class="form-group"><label class="form-label">Image</label><input id="e-image" class="form-input" value="${it.image || ''}" /></div>
                    <div class="form-group"><label class="form-label">Link</label><input id="e-link" class="form-input" value="${it.url || ''}" /></div>
                    <div class="form-group"><label class="form-label">Vendor</label><input id="e-vendor" class="form-input" value="${it.vendor || ''}" /></div>
                    <div class="form-group"><label class="form-label">Project</label>
                        <select id="e-project" class="form-input">${projects.map(p => `<option value="${p.id}" ${p.id===it.project?'selected':''}>${p.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group"><label class="form-label">Purchased</label><input id="e-purchased" type="checkbox" ${it.purchased?'checked':''} /></div>
                    <div class="form-actions"><button id="e-save" class="btn btn-primary">Save</button></div>
                </div>
            </div>`;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#edit-close').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#e-save').addEventListener('click', async () => {
            it.title = overlay.querySelector('#e-name').value.trim() || it.title;
            it.price = parseFloat(overlay.querySelector('#e-price').value || it.price) || 0;
            it.rank = (overlay.querySelector('#e-rank').value || it.rank).toUpperCase();
            it.image = overlay.querySelector('#e-image').value.trim();
            it.url = overlay.querySelector('#e-link').value.trim();
            it.vendor = overlay.querySelector('#e-vendor').value.trim();
            it.project = overlay.querySelector('#e-project').value;
            it.purchased = overlay.querySelector('#e-purchased').checked;
            try { await updateJSONBin(); toast('Item updated'); renderAdminDashboard(); } catch { toast('Failed to save'); }
            overlay.remove();
        });
    }

    function openProjectEdit(index) {
        const p = projects[index];
        if (!p) return;
        const overlay = document.createElement('div');
        overlay.className = 'modal';
        overlay.innerHTML = `
            <div class="modal-dialog">
                <header class="modal-header">
                    <h2 class="modal-title">Edit Project</h2>
                    <button class="modal-close" id="p-edit-close">×</button>
                </header>
                <div class="modal-body">
                    <div class="form-group"><label class="form-label">Name</label><input id="p-name" class="form-input" value="${p.name}" /></div>
                    <div class="form-group"><label class="form-label">Description</label><textarea id="p-desc" class="form-input" rows="3">${p.description || ''}</textarea></div>
                    <div class="form-group"><label class="form-label">Icon</label><input id="p-icon" class="form-input" value="${p.icon || '📁'}" /></div>
                    <div class="form-group"><label class="form-label">Color</label><input id="p-color" class="form-input" value="${p.color || '#f97316'}" /></div>
                    <div class="form-group"><label class="form-label">Project Icon Image (URL)</label><input id="p-image" class="form-input" value="${p['project-icon-image'] || ''}" /></div>
                    <div class="form-actions"><button id="p-save" class="btn btn-primary">Save</button></div>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#p-edit-close').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#p-save').addEventListener('click', async () => {
            p.name = overlay.querySelector('#p-name').value.trim() || p.name;
            p.description = overlay.querySelector('#p-desc').value.trim();
            p.icon = overlay.querySelector('#p-icon').value.trim() || p.icon;
            p.color = overlay.querySelector('#p-color').value.trim() || p.color;
            p['project-icon-image'] = overlay.querySelector('#p-image').value.trim();
            try { await updateJSONBin(); toast('Project updated'); renderAdminDashboard(); } catch { toast('Failed to save'); }
            overlay.remove();
        });
    }


    function renderAdminItems() {
        const projectOptions = projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

        return `
            <div class="admin-card">
                <h2 class="section-title">Add New Item</h2>
                <div class="form-group">
                    <label class="form-label">Name *</label>
                    <input id="new-name" class="form-input" placeholder="Item name" />
                </div>
                <div class="form-group">
                    <label class="form-label">Price *</label>
                    <input id="new-price" type="number" step="0.01" min="0" class="form-input" value="0" />
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea id="new-desc" class="form-input" rows="3" placeholder="Describe the item"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Image URL</label>
                    <input id="new-image" class="form-input" placeholder="https://..." />
                </div>
                <div class="form-group">
                    <label class="form-label">Priority Rank</label>
                    <input id="new-rank" class="form-input" value="A" />
                </div>
                <div class="form-group">
                    <label class="form-label">Project</label>
                    <select id="new-project" class="form-input">
                        <option value="">Select a project</option>
                        ${projectOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Store</label>
                    <input id="new-vendor" class="form-input" placeholder="Amazon, Target, etc." />
                </div>
                <div class="form-group">
                    <label class="form-label">Link (optional)</label>
                    <input id="new-link" class="form-input" placeholder="https://..." />
                </div>
                <div class="form-group">
                    <label class="form-label">Already purchased</label>
                    <input id="new-purchased" type="checkbox" />
                </div>
                <button id="add-item" class="btn btn-primary">Add Item</button>
            </div>

            <div class="admin-card">
                <h2 class="section-title">Existing Items</h2>
                <div class="admin-list">
                    ${items.map((it, idx) => `
                        <div class="admin-list-row">
                            <div class="admin-list-main">
                                <div class="admin-list-title">${it.title}</div>
                                <div class="admin-list-sub">$${Number(it.price || 0).toFixed(2)} · ${it.vendor || 'Unknown'}</div>
                            </div>
                            <div class="admin-list-actions">
                                <button class="btn btn-secondary" data-edit="${idx}">Edit</button>
                                <button class="btn btn-secondary" data-del="${idx}">Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderAdminProjects() {
        return `
            <div class="admin-card">
                <h2 class="section-title">Add New Project</h2>
                <div class="form-group">
                    <label class="form-label">Name *</label>
                    <input id="proj-name" class="form-input" placeholder="Project name" />
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea id="proj-desc" class="form-input" rows="3" placeholder="Describe the project"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Icon (emoji)</label>
                    <input id="proj-icon" class="form-input" placeholder="📦" />
                </div>
                <div class="form-group">
                    <label class="form-label">Color (hex)</label>
                    <input id="proj-color" class="form-input" placeholder="#ff8800" />
                </div>
                <div class="form-group">
                    <label class="form-label">Project Icon Image (URL)</label>
                    <input id="proj-image" class="form-input" placeholder="https://..." />
                </div>
                <button id="add-project" class="btn btn-primary">Add Project</button>
            </div>

            <div class="admin-card">
                <h2 class="section-title">Existing Projects</h2>
                <div class="admin-list">
                    ${projects.map((p, idx) => `
                        <div class="admin-list-row">
                            <div class="admin-list-main">
                                <div class="admin-list-title">${p.name}</div>
                                <div class="admin-list-sub">${p.description || ''}</div>
                            </div>
                            <div class="admin-list-actions">
                                <button class="btn btn-secondary" data-edit-proj="${idx}">Edit</button>
                                <button class="btn btn-secondary" data-del-proj="${idx}">Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
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
        // Load admin session
        isAdmin = localStorage.getItem('wishlist-admin') === 'true';
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
        
        // Gate admin dashboard
        if (route === 'admin' && !isAdmin) {
            currentRoute = 'admin-login';
        } else {
            currentRoute = route;
        }
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

    // Update header content for non-home pages
    function updateHeaderContent() {
        const headerContent = document.querySelector('.header-content');
        if (headerContent && currentRoute !== 'home') {
            headerContent.innerHTML = `
                <div class="header-brand" onclick="navigateTo('home')" style="cursor: pointer;">
                    <div class="header-icon">🎁</div>
                    <div class="header-title">Josh's Wishlist</div>
                </div>
                <div class="header-subtitle" onclick="navigateTo('home')" style="cursor: pointer;">A curated collection of birthday wishes organized just for you</div>
            `;
        }
    }

    // Main render function
    function render() {
        // Update body class for styling
        document.body.classList.toggle('home-page', currentRoute === 'home');
        
        // Update header content for non-home pages
        updateHeaderContent();
        
        if (currentRoute.startsWith('project-')) {
            const projectId = currentRoute.replace('project-', '');
            renderProjectDetail(projectId);
        } else {
        switch (currentRoute) {
            case 'home':
                renderHome();
                break;
            case 'admin-login':
                renderAdminLogin();
                break;
            case 'admin':
                if (!isAdmin) { renderAdminLogin(); break; }
                renderAdminDashboard();
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
                <div class="hero-icon" id="secret-hero">🎁</div>
                <h1 class="hero-title">Josh's Wishlist</h1>
                <p class="hero-subtitle">A curated collection of birthday wishes organized just for you</p>
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
                        <div class="category-icon">🏗️</div>
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

        // Secret 5-tap to open admin
        const secretHero = document.getElementById('secret-hero');
        if (secretHero) {
            secretHero.addEventListener('click', () => {
                const now = Date.now();
                if (now - lastSecretTapTs > 2000) {
                    secretTapCount = 0; // reset if more than 2s passed
                }
                lastSecretTapTs = now;
                secretTapCount += 1;
                if (secretTapCount >= 5) {
                    secretTapCount = 0;
                    navigateTo('admin-login');
                }
            });
        }
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

    // Render individual project detail
    function renderProjectDetail(projectId) {
        const project = projects.find(p => p.id === projectId);
        if (!project) {
            renderHome();
            return;
        }

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
                <div class="project-description-container">
                    <p class="page-subtitle">${project.description}</p>
                    <div class="project-stats">
                        <div class="stat-item">
                            <span class="stat-number">${projectItems.length}</span>
                            <span class="stat-label">Total Items</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${projectItems.filter(item => !item.purchased).length}</span>
                            <span class="stat-label">Available</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${projectItems.filter(item => item.purchased).length}</span>
                            <span class="stat-label">Purchased</span>
                        </div>
                    </div>
                </div>
                ${project.giftNote ? `
                    <div class="project-gift-note">
                        <div class="gift-note-label">Gift Note:</div>
                        <div class="gift-note-content">${project.giftNote}</div>
                    </div>
                ` : ''}
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
                    navigateTo('by-project');
                });
            } else {
                console.error('Back to projects button not found');
            }
        }, 0);
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
                ${projects
                    .map(project => {
                    // Calculate actual item count for this project
                    const actualItemCount = items.filter(item => item.project === project.id && !item.purchased).length;
                        return { project, actualItemCount };
                    })
                    .sort((a, b) => b.actualItemCount - a.actualItemCount) // Sort by item count descending
                    .map(({ project, actualItemCount }) => {
                        // Check if project has an icon image
                    if (project['project-icon-image']) {
                        return `
                        <div class="category-card project-icon-card" data-project="${project.id}">
                            <div class="project-icon-image-container">
                                <div class="project-icon-bg" style="background-image: url('${project['project-icon-image']}');"></div>
                            </div>
                            <div class="project-name">${project.name}</div>
                        </div>
                        `;
                    } else {
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
                    }
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
                    // Navigate to project-specific route
                    navigateTo(`project-${projectId}`);
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

    // Helper function to get domain from URL
    function getDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (e) {
            return 'amazon.com'; // fallback
        }
    }

    // Helper function to get the primary URL for an item
    function getItemUrl(item) {
        // First try direct url field
        if (item.url) {
            return item.url;
        }
        
        // Then try links array (get primary link)
        if (item.links && item.links.length > 0) {
            const primaryLink = item.links.find(link => link.type === 'primary') || item.links[0];
            return primaryLink.url;
        }
        
        // Fallback to Amazon
        return 'https://amazon.com';
    }

    // Render individual item cards
    function renderItemCards(itemList) {
        return itemList.map(item => {
            const project = projects.find(p => p.id === item.project);
            const isPurchased = item.purchased;
            const itemUrl = getItemUrl(item);
            const domain = getDomainFromUrl(itemUrl);
            
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
                        <div class="product-header">
                            <h3 class="product-title">${item.title}</h3>
                            <div class="product-price">$${item.price.toFixed(2)}</div>
                        </div>
                        <div class="product-vendor">
                            <span class="vendor-badge">${item.vendor}</span>
                        </div>
                        <div class="product-actions">
                            ${isPurchased ? 
                                `<button class="btn btn-purchased tooltip" data-tooltip="Already purchased" disabled>Purchased</button>` :
                                `<button class="btn btn-primary tooltip" data-tooltip="Mark as purchased" onclick="openPurchaseModal('${item.id}')">Mark as purchased</button>`
                            }
                        </div>
                        <div class="product-link">
                            <button class="btn btn-secondary btn-block" onclick="openLink('${item.id}')">View Item</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Item interaction functions
    window.openLink = (itemId) => {
        const item = items.find(i => i.id === itemId);
        if (item) {
            const itemUrl = getItemUrl(item);
            window.open(itemUrl, '_blank');
        } else {
            // Fallback to Amazon
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
