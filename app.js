(() => {
    'use strict';

    // State
    let route = 'home', query = '', items = [], projects = [], admin = false, adminTab = 'items';
    let adminSecret = 'secret';
    let taps = 0, lastTap = 0, purchaseId = null;

    // Config
    const API_URL = 'https://api.jsonbin.io/v3/b/68bd0199ae596e708fe558a8/latest';
    const KEY = '$2a$10$qCWunkuQ.RvrVSMrdAzXA.h.BWSmvB6NkAIaEXVd5rUQ7E4RzwCyq';

    // Utils
    const $ = id => document.getElementById(id);
    const $$ = sel => document.querySelectorAll(sel);
    const toast = msg => {
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        $('toast-stack').appendChild(el);
        setTimeout(() => el.remove(), 3000);
    };
    const sfx = file => {
        try {
            const a = new Audio(file);
            a.volume = 0.05;
            a.play().catch(() => {});
        } catch {}
    };

    // Data
    const load = async () => {
        try {
            const res = await fetch(API_URL, { headers: { 'X-Access-Key': KEY } });
            if (res.ok) {
                const data = (await res.json()).record || {};
                items = data.items || [];
                projects = data.projects || [];
                adminSecret = (data.secret || data.adminSecret || localStorage.getItem('wishlist-secret') || 'secret').toString();
            } else throw new Error();
        } catch {
            const saved = JSON.parse(localStorage.getItem('wishlist-items') || '[]');
            const savedProj = JSON.parse(localStorage.getItem('wishlist-projects') || '[]');
            const savedSecret = localStorage.getItem('wishlist-secret') || 'secret';
            items = saved;
            projects = savedProj;
            adminSecret = savedSecret;
        }
        
        // Heal missing projects
        const projIds = new Set(projects.map(p => p.id));
        const missing = new Set();
        items.forEach(i => i.project && !projIds.has(i.project) && missing.add(i.project));
        missing.forEach(id => projects.push({
            id, name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: 'Auto-created', icon: '📦', color: '#f97316'
        }));
        
        localStorage.setItem('wishlist-items', JSON.stringify(items));
        localStorage.setItem('wishlist-projects', JSON.stringify(projects));
        localStorage.setItem('wishlist-secret', adminSecret);
    };

    const save = async () => {
        const res = await fetch(API_URL.replace('/latest', ''), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Access-Key': KEY },
            body: JSON.stringify({ items, projects, secret: adminSecret })
        });
        if (!res.ok) throw new Error();
        localStorage.setItem('wishlist-items', JSON.stringify(items));
        localStorage.setItem('wishlist-projects', JSON.stringify(projects));
        localStorage.setItem('wishlist-secret', adminSecret);
    };

    // Navigation
    const nav = to => {
        if (route === to) return;
        if (to === 'admin' && !admin) to = 'admin-login';
        route = to;
        
        const url = new window.URL(window.location.href);
        to === 'home' ? url.searchParams.delete('route') : url.searchParams.set('route', to);
        history.pushState({ route: to }, '', url);
        
        $$('.nav-item').forEach(i => i.classList.toggle('is-active', i.dataset.route === route));
            render();
    };

    // Rendering
    const cards = list => list.map(item => {
        const bought = item.purchased;
        const url = item.url || (item.links?.length ? item.links[0].url : 'https://amazon.com');
        const domain = url.split('/')[2] || 'amazon.com';
        
        return `<div class="product-card${bought ? ' purchased' : ''}">
            <div class="product-image">
                ${item.image ? `<img src="${item.image}" alt="${item.title}" onerror="this.onerror=null; this.style.display='none'; if (this.nextElementSibling) { this.nextElementSibling.style.display='flex'; }"><div class="placeholder" style="display:none">📦</div>` : '<div class="placeholder">📦</div>'}
                <div class="rank-badge rank-${item.rank}">${item.rank}</div>
            </div>
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-title">${item.title}</h3>
                    <div class="product-price">$${item.price.toFixed(2)}</div>
                </div>
                <div class="product-vendor"><span class="vendor-badge">${item.vendor}</span></div>
                <div class="product-actions">
                    ${bought ? '<button class="btn btn-purchased" disabled>Purchased</button>' : 
                              `<button class="btn btn-primary" onclick="openPurchase('${item.id}')">Mark as purchased</button>`}
                </div>
                <div class="product-link"><button class="btn btn-secondary btn-block" onclick="openLink('${item.id}')">View Item</button></div>
            </div>
        </div>`;
    }).join('');

    const sort = (list, fn) => list.sort((a, b) => {
        if (a.purchased && !b.purchased) return 1;
        if (!a.purchased && b.purchased) return -1;
        return fn ? fn(a, b) : 0;
    });

    const page = (title, sub, list, sortFn) => {
        const filtered = list.filter(i => !query || i.title.toLowerCase().includes(query.toLowerCase()));
        return `<button class="back-button" onclick="nav('home')">← Back</button>
            <div class="page-header"><h1 class="page-title">${title}</h1><p class="page-subtitle">${sub}</p></div>
            <div class="product-grid">${cards(sort(filtered, sortFn))}</div>`;
    };

    const home = () => {
        const homeContent = $('home-content');
        if (homeContent) homeContent.style.display = 'block';
        
        const under20 = items.filter(i => i.price <= 20 && !i.purchased).length;
        const thirty = items.filter(i => i.price > 20 && i.price <= 30 && !i.purchased).length;
        const ranks = { S: 0, A: 0, B: 0, C: 0 };
        items.forEach(i => ranks[i.rank] = (ranks[i.rank] || 0) + 1);
        
        const under20El = $('under20-count');
        const thirtyEl = $('thirty-count');
        const projectEl = $('project-count');
        const pillsEl = $('priority-pills');
        
        if (under20El) under20El.textContent = `${under20} gift ideas`;
        if (thirtyEl) thirtyEl.textContent = `${thirty} gift ideas`;
        if (projectEl) projectEl.textContent = `${projects.length} projects`;
        if (pillsEl) pillsEl.innerHTML = Object.entries(ranks).map(([r, c]) => `<span class="priority-pill">${r}: ${c}</span>`).join('');

        if (!window.homeSet) {
            $$('.category-card').forEach(c => c.onclick = e => {
                const r = e.currentTarget.dataset.route;
                if (r) { sfx('sounds/super_mario_bros_mushroom_sound_effect_58k.mp3'); nav(r); }
            });
            
            const secretHero = $('secret-hero');
            if (secretHero) {
                secretHero.onclick = () => {
                    const now = Date.now();
                    if (now - lastTap > 2000) taps = 0;
                    lastTap = now;
                    if (++taps >= 5) { taps = 0; sfx('sounds/ringtones-zelda-1.mp3'); nav('admin-login'); }
                };
            }
            window.homeSet = true;
        }
    };

    const render = () => {
        // Keep home-page class set initially for static landing; remove only when leaving home
        if (route === 'home') {
            document.body.classList.add('home-page');
        } else {
            document.body.classList.remove('home-page');
        }
        
        const hc = document.querySelector('.header-content');
        if (hc && route !== 'home') {
            hc.innerHTML = `<div class="header-brand" onclick="nav('home')" style="cursor:pointer">
                <div class="header-icon">🎁</div><div class="header-title">Josh's Wishlist</div></div>
                <div class="header-subtitle" onclick="nav('home')" style="cursor:pointer">A curated collection of birthday wishes organized just for you</div>`;
        }
        
        const homeEl = $('home-content');
        const contentArea = $('content-area');
        let viewEl = $('route-view');
        
        if (route === 'home') {
            if (homeEl) homeEl.style.display = 'block';
            if (viewEl) { viewEl.innerHTML = ''; viewEl.style.display = 'none'; }
        } else {
            if (homeEl) homeEl.style.display = 'none';
            if (!contentArea) return;
            if (viewEl) viewEl.style.display = 'block';
        }
        if (route.startsWith('project-')) {
            const projId = route.replace('project-', '');
            const proj = projects.find(p => p.id === projId);
            if (!proj) return nav('home');
            const projItems = sort(items.filter(i => i.project === projId));
            const avail = projItems.filter(i => !i.purchased).length;
            const bought = projItems.filter(i => i.purchased).length;
            if (!viewEl) return;
            viewEl.innerHTML = `<button class="back-button" onclick="nav('by-project')">← Back to Projects</button>
                <div class="page-header"><h1 class="page-title">${proj.name}</h1>
                <div class="project-description-container"><p class="page-subtitle">${proj.description}</p>
                <div class="project-stats">
                    <div class="stat-item"><span class="stat-number">${projItems.length}</span><span class="stat-label">Total</span></div>
                    <div class="stat-item"><span class="stat-number">${avail}</span><span class="stat-label">Available</span></div>
                    <div class="stat-item"><span class="stat-number">${bought}</span><span class="stat-label">Purchased</span></div>
                </div></div></div><div class="product-grid">${cards(projItems)}</div>`;
        } else {
            switch (route) {
                case 'home': home(); break;
                case 'admin-login': 
                    if (!viewEl) return;
                    viewEl.innerHTML = `<div class="admin-login-card"><div class="admin-login-icon">🔒</div><h2 class="admin-login-title">Admin Access</h2>
                        <div class="form-group"><label>Password</label><input id="admin-pass" type="password" class="form-input" />
                        <div id="admin-error" class="admin-error hidden">Invalid password</div></div>
                        <button onclick="login()" class="btn btn-primary btn-block">Login</button></div>`;
                    break;
                case 'admin': 
                    if (!admin) return nav('admin-login');
                    const projOpts = projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
                    if (!viewEl) return;
                    viewEl.innerHTML = `<div class="admin-header"><h1>Admin Dashboard</h1>
                        <button onclick="logoutAdmin()" class="btn btn-secondary">Logout</button></div>
                        <div class="admin-tabs">
                        <button class="admin-tab ${adminTab==='items'?'active':''}" onclick="setAdminTab('items')">Items</button>
                        <button class="admin-tab ${adminTab==='projects'?'active':''}" onclick="setAdminTab('projects')">Projects</button></div>
                        <div class="admin-section">${adminTab === 'items' ? 
                        `<div class="admin-card"><h2>Add Item</h2>
                        <div class="form-group"><label>Name</label><input id="n-name" class="form-input" placeholder="Name" /></div>
                        <div class="form-group"><label>Price</label><input id="n-price" type="number" class="form-input" value="0" /></div>
                        <div class="form-group"><label>Vendor</label><input id="n-vendor" class="form-input" placeholder="Vendor (e.g., Amazon)" /></div>
                        <div class="form-group"><label>Project</label><select id="n-proj" class="form-input"><option value="">None</option>${projOpts}</select></div>
                        <div class="form-group"><label>Rank</label><select id="n-rank" class="form-input"><option value="S">S</option><option value="A" selected>A</option><option value="B">B</option><option value="C">C</option></select></div>
                        <div class="form-group"><label>Image URL</label><input id="n-image" class="form-input" placeholder="https://..." /></div>
                        <div class="form-group"><label>Item URL</label><input id="n-url" class="form-input" placeholder="https://..." /></div>
                        <div class="form-group"><label><input id="n-purchased" type="checkbox" /> Purchased</label></div>
                        <button onclick="addItem()" class="btn btn-primary">Add Item</button></div>
                        <div class="admin-card"><h2>Items</h2><div class="admin-list">
                        ${items.map((it, i) => `<div class="admin-list-row"><div class="admin-list-main">
                        <div class="admin-list-title">${it.title}</div></div>
                        <button onclick="delItem(${i})" class="btn btn-secondary">Delete</button></div>`).join('')}</div></div>` :
                        `<div class="admin-card"><h2>Add Project</h2>
                        <div class="form-group"><label>Name</label><input id="p-name" class="form-input" placeholder="Name" /></div>
                        <div class="form-group"><label>Description</label><textarea id="p-desc" class="form-input" placeholder="Description"></textarea></div>
                        <div class="form-group"><label>Icon</label><input id="p-icon" class="form-input" value="📦" /></div>
                        <div class="form-group"><label>Color</label><input id="p-color" class="form-input" value="#f97316" /></div>
                        <div class="form-group"><label>Project Icon Image URL</label><input id="p-pimg" class="form-input" placeholder="https://..." /></div>
                        <button onclick="addProj()" class="btn btn-primary">Add Project</button></div>
                        <div class="admin-card"><h2>Projects</h2><div class="admin-list">
                        ${projects.map((p, i) => `<div class="admin-list-row"><div class="admin-list-main">
                        <div class="admin-list-title">${p.name}</div></div>
                        <button onclick="delProj(${i})" class="btn btn-secondary">Delete</button></div>`).join('')}</div></div>`}</div>`;
                break;
            case 'under-20':
                    const under20Items = items.filter(i => i.price <= 20 && (!query || i.title.toLowerCase().includes(query.toLowerCase())));
                    if (!viewEl) return;
                    viewEl.innerHTML = `<button class="back-button" onclick="nav('home')">← Back</button>
                        <div class="page-header"><h1 class="page-title">Under $20</h1><p class="page-subtitle">Small gifts</p></div>
                        <div class="product-grid">${cards(sort(under20Items))}</div>`;
                break;
            case '30-items':
                    const thirtyItems = items.filter(i => i.price > 20 && i.price <= 30 && (!query || i.title.toLowerCase().includes(query.toLowerCase())));
                    if (!viewEl) return;
                    viewEl.innerHTML = `<button class="back-button" onclick="nav('home')">← Back</button>
                        <div class="page-header"><h1 class="page-title">$30 Items</h1><p class="page-subtitle">Great value</p></div>
                        <div class="product-grid">${cards(sort(thirtyItems))}</div>`;
                break;
            case 'by-rank':
                    const ranks = { S: 4, A: 3, B: 2, C: 1 };
                    const filtered = items.filter(i => !query || i.title.toLowerCase().includes(query.toLowerCase()));
                    const sorted = sort(filtered, (a, b) => (ranks[b.rank] || 0) - (ranks[a.rank] || 0));
                    if (!viewEl) return;
                    viewEl.innerHTML = `<button class="back-button" onclick="nav('home')">← Back</button>
                        <div class="priority-header"><h1>By Priority</h1></div>
                        <div class="product-grid">${cards(sorted)}</div>`;
                break;
            case 'by-project':
                    const sorted2 = projects.map(p => ({ p, count: items.filter(i => i.project === p.id && !i.purchased).length }))
                        .sort((a, b) => b.count - a.count);
                    if (!viewEl) return;
                    viewEl.innerHTML = `<button class="back-button" onclick="nav('home')">← Back</button>
                        <div class="page-header"><h1>Projects</h1></div><div class="category-grid">
                        ${sorted2.map(({ p, count }) => p['project-icon-image'] ? 
                            `<div class="category-card project-icon-card" onclick="nav('project-${p.id}')">
                                <div class="project-icon-image-container">
                                    <div class="project-icon-bg" style="background-image:url('${p['project-icon-image']}')"></div>
                                </div><div class="project-name">${p.name}</div></div>` :
                            `<div class="category-card" onclick="nav('project-${p.id}')" style="background:linear-gradient(135deg,${p.color}22,${p.color}44)">
                                <div class="category-header"><div class="category-icon">${p.icon}</div><div class="category-title">${p.name}</div></div>
                                <div class="category-description">${p.description}</div><div class="category-count">${count} items</div></div>`
                        ).join('')}</div>`;
                break;
            case 'purchased':
                    const purchasedItems = items.filter(i => i.purchased && (!query || i.title.toLowerCase().includes(query.toLowerCase())));
                    if (!viewEl) return;
                    viewEl.innerHTML = `<button class="back-button" onclick="nav('home')">← Back</button>
                        <div class="page-header"><h1 class="page-title">Purchased Items</h1><p class="page-subtitle">Bought items</p></div>
                        <div class="product-grid">${cards(sort(purchasedItems))}</div>`;
                break;
                default: home(); break;
            }
        }
    };

    // Global functions
    window.nav = nav;
    window.login = () => {
        const passEl = $('admin-pass');
        const errEl = $('admin-error');
        const entered = (passEl ? passEl.value.trim() : '').toString();
        if (entered && entered === adminSecret) {
            sfx('sounds/ringtones-zelda-1.mp3');
            admin = true;
            localStorage.setItem('wishlist-admin', 'true');
            nav('admin');
        } else if (errEl) {
            errEl.classList.remove('hidden');
        }
    };
    window.addItem = async () => {
        const name = $('n-name').value.trim();
        if (!name) return toast('Name required');
        const price = +$('n-price').value || 0;
        const vendor = $('n-vendor').value.trim();
        const project = $('n-proj').value;
        const rank = $('n-rank').value || 'A';
        const image = $('n-image').value.trim();
        const url = $('n-url').value.trim();
        const purchased = $('n-purchased').checked;
        items.push({ id: name.toLowerCase().replace(/\s+/g, '-'), title: name, price, project, rank, vendor, image, url, purchased });
        try { await save(); toast('Item added'); render(); } catch { toast('Save failed'); }
    };
    window.setAdminTab = tab => { adminTab = tab; render(); };
    window.logoutAdmin = () => { admin = false; localStorage.removeItem('wishlist-admin'); nav('home'); };
    window.delItem = async i => {
        if (!confirm(`Delete "${items[i].title}"?`)) return;
        items.splice(i, 1);
        try { await save(); toast('Deleted'); render(); } catch { toast('Failed'); }
    };
    window.addProj = async () => {
        const name = $('p-name').value.trim();
        if (!name) return toast('Name required');
        const description = $('p-desc').value.trim();
        const icon = $('p-icon').value || '📦';
        const color = $('p-color').value;
        const pimg = $('p-pimg').value.trim();
        const id = name.toLowerCase().replace(/\s+/g, '-');
        projects.push({ id, name, description, icon, color, ...(pimg ? { 'project-icon-image': pimg } : {}) });
        try { await save(); toast('Project added'); render(); } catch { toast('Save failed'); }
    };
    window.delProj = async i => {
        if (!confirm(`Delete "${projects[i].name}"?`)) return;
        items.forEach(it => { if (it.project === projects[i].id) it.project = ''; });
        projects.splice(i, 1);
        try { await save(); toast('Deleted'); render(); } catch { toast('Failed'); }
    };
    window.openPurchase = id => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        purchaseId = id;
        $('purchase-confirm-text').textContent = `Mark "${item.title}" as purchased?`;
        $('purchase-modal').removeAttribute('hidden');
    };
    window.confirmPurchase = async () => {
        const item = items.find(i => i.id === purchaseId);
        if (!item) return;
        item.purchased = true;
        try {
            await save();
            $('purchase-modal').setAttribute('hidden', 'true');
            sfx('sounds/zelda-chest-opening-and-item-catch.mp3');
            render();
            toast('Purchased!');
        } catch { toast('Failed'); }
        purchaseId = null;
    };
    window.openLink = id => {
        const item = items.find(i => i.id === id);
        if (item) {
            const url = item.url || (item.links?.length ? item.links[0].url : 'https://amazon.com');
            window.open(url, '_blank');
        }
    };

    // Events
    const bind = () => {
        const menuBtn = $('menu-btn');
        const closeNav = document.querySelector('.close-nav');
        const navOverlay = $('nav-overlay');
        const globalSearch = $('global-search');
        const homeTitle = $('home-title');
        const purchaseClose = $('purchase-modal-close');
        const purchaseCancel = $('purchase-cancel');
        const purchaseConfirm = $('purchase-confirm');
        const purchaseModal = $('purchase-modal');
        
        if (menuBtn) menuBtn.onclick = () => navOverlay && navOverlay.removeAttribute('hidden');
        if (closeNav) closeNav.onclick = () => navOverlay && navOverlay.setAttribute('hidden', '');
        if (navOverlay) navOverlay.onclick = e => e.target === navOverlay && navOverlay.setAttribute('hidden', '');
        if (homeTitle) homeTitle.onclick = () => nav('home');
        
        $$('.nav-item').forEach(i => i.onclick = () => { 
            nav(i.dataset.route); 
            navOverlay && navOverlay.setAttribute('hidden', ''); 
        });
        
        if (globalSearch) globalSearch.oninput = e => { query = e.target.value.trim(); render(); };
        if (purchaseClose) purchaseClose.onclick = () => purchaseModal && purchaseModal.setAttribute('hidden', 'true');
        if (purchaseCancel) purchaseCancel.onclick = () => purchaseModal && purchaseModal.setAttribute('hidden', 'true');
        if (purchaseConfirm) purchaseConfirm.onclick = window.confirmPurchase;
        
        window.onpopstate = e => {
            if (e.state && e.state.route) {
                route = e.state.route;
    } else {
                const r = new URLSearchParams(location.search).get('route') || 'home';
                route = r;
            }
            if (navOverlay) navOverlay.setAttribute('hidden', '');
            render();
        };
    };

    // Init
    const init = async () => {
        await load();
        bind();
        const r = new URLSearchParams(location.search).get('route');
        if (r) route = r;
        admin = localStorage.getItem('wishlist-admin') === 'true';
        render();
    };

    // Start
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
