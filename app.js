(() => {
    'use strict';

    // Config
    const BIN_URL = 'https://api.jsonbin.io/v3/b/68bd0199ae596e708fe558a8';
    const KEY = '$2a$10$qCWunkuQ.RvrVSMrdAzXA.h.BWSmvB6NkAIaEXVd5rUQ7E4RzwCyq';
    const RANKS = ['S', 'A', 'B', 'C'];
    const DEFAULT_COLOR = '#f97316';
    const PBKDF2_ITERATIONS = 100000;
    const SAVE_FAIL = "Couldn't save. Check your connection and try again.";
    const SFX = {
        nav: 'sounds/super_mario_bros_mushroom_sound_effect_58k.mp3',
        secret: 'sounds/ringtones-zelda-1.mp3',
        purchase: 'sounds/zelda-chest-opening-and-item-catch.mp3'
    };

    // State
    let route = 'home', query = '', admin = false, adminTab = 'items';
    let record = {}, items = [], projects = [];
    let taps = 0, lastTap = 0, purchaseId = null;

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
    const store = {
        get: (k, fallback) => { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
        set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
        del: k => { try { localStorage.removeItem(k); } catch {} }
    };

    // Everything from the bin goes through esc() before it touches innerHTML
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    // Only http(s) and relative links, so a stray "javascript:" URL can't run
    const safeUrl = v => {
        const u = String(v ?? '').trim();
        try { return u && /^https?:$/.test(new URL(u, 'https://base.invalid/').protocol) ? u : ''; } catch { return ''; }
    };
    const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
    const slug = v => String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').slice(0, 80).replace(/^-+|-+$/g, '') || 'item';
    const SAFE_ID = /^[A-Za-z0-9_-]+$/;
    const uniqueId = (base, taken) => {
        let id = base, n = 2;
        while (taken.has(id)) id = `${base}-${n++}`;
        taken.add(id);
        return id;
    };
    const cleanId = (v, fallback, taken) =>
        uniqueId(v != null && SAFE_ID.test(String(v)) ? String(v) : slug(v != null && v !== '' ? v : fallback), taken);
    const toPrice = v => {
        const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));
        return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
    };
    const toColor = v => {
        const c = String(v ?? '').trim();
        if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(c)) return c.slice(0, 7);
        if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map(x => x + x).join('');
        return DEFAULT_COLOR;
    };

    // Self-heal whatever is in the bin: unsafe or duplicate ids, string prices, odd ranks,
    // items pointing at projects that no longer exist. Unknown fields are kept as-is.
    const normalize = raw => {
        const rec = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : {};
        const projIds = new Set(), renamed = new Map();
        const projs = (Array.isArray(rec.projects) ? rec.projects : []).filter(p => p && typeof p === 'object').map(p => {
            const name = String(p.name || p.id || 'Untitled Project').trim();
            const id = cleanId(p.id, name, projIds);
            if (p.id != null && !renamed.has(String(p.id))) renamed.set(String(p.id), id);
            return { ...p, id, name, description: String(p.description ?? ''), icon: String(p.icon || '📦'), color: toColor(p.color) };
        });
        const itemIds = new Set();
        const its = (Array.isArray(rec.items) ? rec.items : []).filter(i => i && typeof i === 'object').map(i => {
            const title = String(i.title || i.name || 'Untitled').trim();
            const rank = String(i.rank ?? '').trim().toUpperCase();
            const ref = String(i.project ?? '').trim();
            return {
                ...i,
                id: cleanId(i.id, title, itemIds),
                title,
                price: toPrice(i.price),
                rank: RANKS.includes(rank) ? rank : 'A',
                project: ref ? renamed.get(ref) || (SAFE_ID.test(ref) ? ref : slug(ref)) : '',
                vendor: String(i.vendor ?? '').trim(),
                image: String(i.image ?? '').trim(),
                url: String(i.url || i.links?.[0]?.url || '').trim(),
                purchased: i.purchased === true || i.purchased === 'true'
            };
        });
        its.forEach(i => {
            if (!i.project || projIds.has(i.project)) return;
            projIds.add(i.project);
            projs.push({
                id: i.project, name: i.project.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: 'Auto-created', icon: '📦', color: DEFAULT_COLOR
            });
        });
        return { ...rec, items: its, projects: projs };
    };

    // Data
    const fetchRecord = async () => {
        const res = await fetch(`${BIN_URL}/latest`, { headers: { 'X-Access-Key': KEY }, cache: 'no-store' });
        if (!res.ok) throw new Error(`Load failed (${res.status})`);
        return normalize((await res.json()).record);
    };

    const putRecord = async rec => {
        const res = await fetch(BIN_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Access-Key': KEY },
            body: JSON.stringify(rec)
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
    };

    const apply = rec => {
        record = rec;
        items = rec.items;
        projects = rec.projects;
        store.set('wishlist-items', items);
        store.set('wishlist-projects', projects);
    };

    const load = async () => {
        store.del('wishlist-secret'); // older versions cached the admin password here in plain text
        try {
            apply(await fetchRecord());
        } catch {
            apply(normalize({ items: store.get('wishlist-items', []), projects: store.get('wishlist-projects', []) }));
            toast(items.length ? "Can't reach the wishlist server. Showing your last saved copy." : "Couldn't load the wishlist. Try refreshing.");
        }
    };

    // Every write re-reads the latest copy, applies one change, and writes it back, so a tab that has been
    // open for a week can't roll back other people's purchases. Writes run one at a time.
    // fn edits the fresh record in place; returning false means "nothing to write".
    let queue = Promise.resolve();
    const mutate = fn => {
        const run = queue.then(async () => {
            const fresh = await fetchRecord();
            const changed = fn(fresh) !== false;
            const next = normalize(fresh);
            if (changed) await putRecord(next);
            apply(next);
            return changed;
        });
        queue = run.catch(() => {});
        return run;
    };

    // Admin password: stored as a salted PBKDF2 hash, never in plain text
    const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
    const hashPass = async (pass, salt, iterations = PBKDF2_ITERATIONS) => {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
        return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations }, key, 256));
    };
    const makeAuth = async pass => {
        const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
        return { salt, iterations: PBKDF2_ITERATIONS, hash: await hashPass(pass, salt) };
    };
    const setAuth = auth => rec => { rec.auth = auth; delete rec.secret; delete rec.adminSecret; };

    // A plain-text `secret` in the bin still works (and doubles as a reset: type a new one in on jsonbin.io).
    // It is swapped for a hash as soon as it's used to log in.
    const checkPass = async pass => {
        const legacy = record.secret ?? record.adminSecret;
        if (legacy != null && String(legacy) !== '') {
            if (pass !== String(legacy).trim()) return false;
            mutate(setAuth(await makeAuth(pass))).catch(() => {});
            return true;
        }
        const { auth } = record;
        if (!auth?.salt || !auth?.hash) throw new Error('No password to check against');
        return await hashPass(pass, auth.salt, auth.iterations) === auth.hash;
    };

    // Navigation
    const setUrl = push => {
        try {
            const url = new URL(location.href);
            route === 'home' ? url.searchParams.delete('route') : url.searchParams.set('route', route);
            history[push ? 'pushState' : 'replaceState']({ route }, '', url);
        } catch {} // some browsers refuse history updates on file:// pages
    };

    const nav = to => {
        if (to === 'admin' && !admin) to = 'admin-login';
        if (route === to) return;
        route = to;
        setUrl(true);
        window.scrollTo(0, 0);
        render();
    };

    // Rendering
    const card = item => {
        const bought = item.purchased, img = safeUrl(item.image), link = safeUrl(item.url);
        const vendor = item.vendor || hostOf(link);
        return `<div class="product-card${bought ? ' purchased' : ''}">
            <div class="product-image">
                ${img ? `<img src="${esc(img)}" alt="${esc(item.title)}" loading="lazy" onerror="this.onerror=null; this.style.display='none'; if (this.nextElementSibling) { this.nextElementSibling.style.display='flex'; }"><div class="placeholder" style="display:none">📦</div>` : '<div class="placeholder">📦</div>'}
                <div class="rank-badge rank-${item.rank}">${item.rank}</div>
            </div>
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-title">${esc(item.title)}</h3>
                    <div class="product-price">$${item.price.toFixed(2)}</div>
                </div>
                ${vendor ? `<div class="product-vendor"><span class="vendor-badge">${esc(vendor)}</span></div>` : ''}
                <div class="product-actions">
                    ${bought ? '<button class="btn btn-purchased" disabled>Purchased</button>' :
                              `<button class="btn btn-primary" data-action="purchase" data-id="${esc(item.id)}">Mark as purchased</button>`}
                </div>
                ${link ? `<div class="product-link"><a class="btn btn-secondary btn-block" href="${esc(link)}" target="_blank" rel="noopener noreferrer">View Item</a></div>` : ''}
            </div>
        </div>`;
    };

    const matches = i => !query || `${i.title} ${i.vendor}`.toLowerCase().includes(query.toLowerCase());
    const sortItems = (list, fn) => [...list].sort((a, b) => (a.purchased - b.purchased) || (fn ? fn(a, b) : 0));
    const grid = (list, fn) => {
        const shown = sortItems(list.filter(matches), fn);
        return shown.length
            ? `<div class="product-grid">${shown.map(card).join('')}</div>`
            : `<p class="empty-state">${query ? 'No gift ideas match your search.' : 'Nothing here yet.'}</p>`;
    };
    const back = (to = 'home', label = '← Back') => `<button class="back-button" data-action="nav" data-route="${to}">${label}</button>`;
    const page = (title, sub, list, fn) => `${back()}
        <div class="page-header"><h1 class="page-title">${title}</h1><p class="page-subtitle">${sub}</p></div>${grid(list, fn)}`;

    const projectCard = (p, count) => {
        const img = safeUrl(p['project-icon-image']);
        return img
            ? `<div class="category-card project-icon-card" data-action="nav" data-route="project-${p.id}" role="button" tabindex="0">
                <div class="project-icon-image-container"><img class="project-icon-bg" src="${esc(img)}" alt=""></div>
                <div class="project-name">${esc(p.name)}</div></div>`
            : `<div class="category-card" data-action="nav" data-route="project-${p.id}" role="button" tabindex="0" style="background:linear-gradient(135deg,${p.color}22,${p.color}44)">
                <div class="category-header"><div class="category-icon">${esc(p.icon)}</div><div class="category-title">${esc(p.name)}</div></div>
                <div class="category-description">${esc(p.description)}</div><div class="category-count">${count} items</div></div>`;
    };

    const projectView = id => {
        const proj = projects.find(p => p.id === id);
        if (!proj) return undefined;
        const all = items.filter(i => i.project === id);
        const avail = all.filter(i => !i.purchased).length;
        return `${back('by-project', '← Back to Projects')}
            <div class="page-header"><h1 class="page-title">${esc(proj.name)}</h1>
            <div class="project-description-container"><p class="page-subtitle">${esc(proj.description)}</p>
            <div class="project-stats">
                <div class="stat-item"><span class="stat-number">${all.length}</span><span class="stat-label">Total</span></div>
                <div class="stat-item"><span class="stat-number">${avail}</span><span class="stat-label">Available</span></div>
                <div class="stat-item"><span class="stat-number">${all.length - avail}</span><span class="stat-label">Purchased</span></div>
            </div></div></div>${grid(all)}`;
    };

    const searchView = () => {
        const n = items.filter(matches).length;
        return `<button class="back-button" data-action="clear-search">← Clear search</button>
            <div class="page-header"><h1 class="page-title">Search</h1><p class="page-subtitle">${n} result${n === 1 ? '' : 's'} for “${esc(query)}”</p></div>${grid(items)}`;
    };

    const adminItems = () => {
        const projOpts = projects.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
        return `<form class="admin-card" data-form="add-item"><h2>Add Item</h2>
            <div class="form-group"><label for="n-name">Name</label><input id="n-name" class="form-input" placeholder="Name" /></div>
            <div class="form-group"><label for="n-price">Price</label><input id="n-price" type="number" min="0" step="any" class="form-input" value="0" /></div>
            <div class="form-group"><label for="n-vendor">Vendor</label><input id="n-vendor" class="form-input" placeholder="Vendor (e.g., Amazon)" /></div>
            <div class="form-group"><label for="n-proj">Project</label><select id="n-proj" class="form-input"><option value="">None</option>${projOpts}</select></div>
            <div class="form-group"><label for="n-rank">Rank</label><select id="n-rank" class="form-input">${RANKS.map(r => `<option value="${r}"${r === 'A' ? ' selected' : ''}>${r}</option>`).join('')}</select></div>
            <div class="form-group"><label for="n-image">Image URL</label><input id="n-image" class="form-input" placeholder="https://..." /></div>
            <div class="form-group"><label for="n-url">Item URL</label><input id="n-url" class="form-input" placeholder="https://..." /></div>
            <div class="form-group"><label><input id="n-purchased" type="checkbox" /> Purchased</label></div>
            <button type="submit" class="btn btn-primary">Add Item</button></form>
            <div class="admin-card"><h2>Items</h2><div class="admin-list">
            ${items.map(it => `<div class="admin-list-row"><div class="admin-list-main">
                <div class="admin-list-title">${esc(it.title)}</div></div>
                <button class="btn btn-secondary" data-action="del-item" data-id="${esc(it.id)}">Delete</button></div>`).join('')}</div></div>`;
    };

    const adminProjects = () => `<form class="admin-card" data-form="add-proj"><h2>Add Project</h2>
            <div class="form-group"><label for="p-name">Name</label><input id="p-name" class="form-input" placeholder="Name" /></div>
            <div class="form-group"><label for="p-desc">Description</label><textarea id="p-desc" class="form-input" placeholder="Description"></textarea></div>
            <div class="form-group"><label for="p-icon">Icon</label><input id="p-icon" class="form-input" value="📦" /></div>
            <div class="form-group"><label for="p-color">Color</label><input id="p-color" class="form-input" value="${DEFAULT_COLOR}" /></div>
            <div class="form-group"><label for="p-pimg">Project Icon Image URL</label><input id="p-pimg" class="form-input" placeholder="https://..." /></div>
            <button type="submit" class="btn btn-primary">Add Project</button></form>
            <div class="admin-card"><h2>Projects</h2><div class="admin-list">
            ${projects.map(p => `<div class="admin-list-row"><div class="admin-list-main">
                <div class="admin-list-title">${esc(p.name)}</div></div>
                <button class="btn btn-secondary" data-action="del-proj" data-id="${esc(p.id)}">Delete</button></div>`).join('')}</div></div>`;

    const adminSettings = () => `<form class="admin-card" data-form="change-pass"><h2>Change Password</h2>
            <div class="form-group"><label for="new-pass">New password</label><input id="new-pass" type="password" class="form-input" autocomplete="new-password" /></div>
            <button type="submit" class="btn btn-primary">Update Password</button></form>`;

    const ADMIN_TABS = { items: ['Items', adminItems], projects: ['Projects', adminProjects], settings: ['Settings', adminSettings] };

    const views = {
        'under-20': () => page('Under $20', 'Small gifts', items.filter(i => i.price <= 20)),
        '30-items': () => page('$30 Items', 'Great value', items.filter(i => i.price > 20 && i.price <= 30)),
        'by-rank': () => `${back()}<div class="priority-header"><h1>By Priority</h1></div>
            ${grid(items, (a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank))}`,
        'by-project': () => {
            const q = query.toLowerCase();
            const list = projects
                .filter(p => !q || `${p.name} ${p.description}`.toLowerCase().includes(q) || items.some(i => i.project === p.id && matches(i)))
                .map(p => ({ p, count: items.filter(i => i.project === p.id && !i.purchased).length }))
                .sort((a, b) => b.count - a.count);
            return `${back()}<div class="page-header"><h1>Projects</h1></div>
                ${list.length ? `<div class="category-grid">${list.map(({ p, count }) => projectCard(p, count)).join('')}</div>` : '<p class="empty-state">No projects match your search.</p>'}`;
        },
        purchased: () => page('Purchased Items', 'Bought items', items.filter(i => i.purchased)),
        'admin-login': () => `<form class="admin-login-card" data-form="login"><div class="admin-login-icon">🔒</div><h2 class="admin-login-title">Admin Access</h2>
            <div class="form-group"><label for="admin-pass">Password</label><input id="admin-pass" type="password" class="form-input" autocomplete="current-password" />
            <div id="admin-error" class="admin-error hidden">Invalid password</div></div>
            <button type="submit" class="btn btn-primary btn-block">Login</button></form>`,
        admin: () => `<div class="admin-header"><h1>Admin Dashboard</h1>
            <button class="btn btn-secondary" data-action="logout">Logout</button></div>
            <div class="admin-tabs">${Object.entries(ADMIN_TABS).map(([key, [label]]) =>
                `<button class="admin-tab${adminTab === key ? ' active' : ''}" data-action="tab" data-tab="${key}">${label}</button>`).join('')}</div>
            <div class="admin-section">${(ADMIN_TABS[adminTab] || ADMIN_TABS.items)[1]()}</div>`
    };

    // null = show the static home page, undefined = unknown route
    const viewHtml = () => {
        if (route === 'home') return query ? searchView() : null;
        if (route.startsWith('project-')) return projectView(route.slice('project-'.length));
        if (route === 'admin' && !admin) route = 'admin-login';
        return views[route]?.();
    };

    const updateHome = () => {
        const open = items.filter(i => !i.purchased);
        const ranks = Object.fromEntries(RANKS.map(r => [r, 0]));
        items.forEach(i => ranks[i.rank]++);
        $('under20-count').textContent = `${open.filter(i => i.price <= 20).length} gift ideas`;
        $('thirty-count').textContent = `${open.filter(i => i.price > 20 && i.price <= 30).length} gift ideas`;
        $('project-count').textContent = `${projects.length} projects`;
        $('priority-pills').innerHTML = RANKS.map(r => `<span class="priority-pill">${r}: ${ranks[r]}</span>`).join('');
    };

    const render = () => {
        let html = viewHtml();
        if (html === undefined) { route = 'home'; setUrl(false); html = viewHtml(); }
        const onHome = html == null;
        document.body.classList.toggle('home-page', route === 'home');
        $$('.nav-item').forEach(i => i.classList.toggle('is-active', i.dataset.route === route));
        $('home-content').style.display = onHome ? 'block' : 'none';
        const view = $('route-view');
        view.style.display = onHome ? 'none' : 'block';
        view.innerHTML = onHome ? '' : html;
        if (onHome) updateHome();
    };

    // Menu + purchase modal
    const openMenu = () => $('nav-overlay').removeAttribute('hidden');
    const closeMenu = () => $('nav-overlay').setAttribute('hidden', '');

    const openPurchase = id => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        purchaseId = id;
        $('purchase-confirm-text').textContent = `Mark "${item.title}" as purchased?`;
        $('purchase-modal').removeAttribute('hidden');
        $('purchase-confirm').focus();
    };
    const closeModal = () => { $('purchase-modal').setAttribute('hidden', ''); purchaseId = null; };

    const confirmPurchase = async () => {
        const id = purchaseId, btn = $('purchase-confirm');
        if (!id || btn.disabled) return;
        btn.disabled = true;
        try {
            let outcome = 'bought';
            await mutate(rec => {
                const it = rec.items.find(i => i.id === id);
                if (!it || it.purchased) { outcome = it ? 'taken' : 'gone'; return false; }
                it.purchased = true;
            });
            closeModal();
            render();
            if (outcome === 'bought') { sfx(SFX.purchase); toast('Purchased!'); }
            else toast(outcome === 'taken' ? 'Someone already bought this one!' : 'That item was removed from the list.');
        } catch {
            toast(SAVE_FAIL);
        } finally {
            btn.disabled = false;
        }
    };

    // Admin actions
    const saveAndRender = async (fn, done) => {
        try { await mutate(fn); toast(done); render(); } catch { toast(SAVE_FAIL); }
    };

    const forms = {
        login: async () => {
            const entered = $('admin-pass').value.trim();
            let ok = false;
            try { ok = !!entered && await checkPass(entered); } catch {
                return toast(window.isSecureContext ? "Can't check the password right now. Try again once you're online." : 'Admin login needs an https:// connection.');
            }
            if (!ok) return $('admin-error').classList.remove('hidden');
            sfx(SFX.secret);
            admin = true;
            store.set('wishlist-admin', true);
            nav('admin');
        },
        'add-item': async () => {
            const title = $('n-name').value.trim();
            if (!title) return toast('Name required');
            const fields = {
                title, price: toPrice($('n-price').value), vendor: $('n-vendor').value.trim(), project: $('n-proj').value,
                rank: $('n-rank').value || 'A', image: $('n-image').value.trim(), url: $('n-url').value.trim(), purchased: $('n-purchased').checked
            };
            await saveAndRender(rec => { rec.items.push({ id: uniqueId(slug(title), new Set(rec.items.map(i => i.id))), ...fields }); }, 'Item added');
        },
        'add-proj': async () => {
            const name = $('p-name').value.trim();
            if (!name) return toast('Name required');
            const pimg = $('p-pimg').value.trim();
            const fields = {
                name, description: $('p-desc').value.trim(), icon: $('p-icon').value || '📦', color: $('p-color').value.trim(),
                ...(pimg ? { 'project-icon-image': pimg } : {})
            };
            await saveAndRender(rec => { rec.projects.push({ id: uniqueId(slug(name), new Set(rec.projects.map(p => p.id))), ...fields }); }, 'Project added');
        },
        'change-pass': async () => {
            const pass = $('new-pass').value.trim();
            if (pass.length < 6) return toast('Use at least 6 characters');
            let auth;
            try { auth = await makeAuth(pass); } catch { return toast('Admin login needs an https:// connection.'); }
            await saveAndRender(setAuth(auth), 'Password updated');
        }
    };

    const actions = {
        nav: el => {
            if (el.dataset.sfx) sfx(SFX[el.dataset.sfx]);
            closeMenu();
            nav(el.dataset.route);
        },
        'menu-open': openMenu,
        'menu-close': closeMenu,
        'secret-tap': () => {
            const now = Date.now();
            if (now - lastTap > 2000) taps = 0;
            lastTap = now;
            if (++taps >= 5) { taps = 0; sfx(SFX.secret); nav('admin'); }
        },
        'clear-search': () => { query = ''; $('global-search').value = ''; render(); },
        purchase: el => openPurchase(el.dataset.id),
        'confirm-purchase': confirmPurchase,
        'close-modal': closeModal,
        logout: () => { admin = false; store.del('wishlist-admin'); nav('home'); },
        tab: el => { adminTab = el.dataset.tab; render(); },
        'del-item': el => {
            const it = items.find(i => i.id === el.dataset.id);
            if (it && confirm(`Delete "${it.title}"?`)) saveAndRender(rec => { rec.items = rec.items.filter(i => i.id !== it.id); }, 'Deleted');
        },
        'del-proj': el => {
            const p = projects.find(x => x.id === el.dataset.id);
            if (!p || !confirm(`Delete "${p.name}"?`)) return;
            saveAndRender(rec => {
                rec.items.forEach(i => { if (i.project === p.id) i.project = ''; });
                rec.projects = rec.projects.filter(x => x.id !== p.id);
            }, 'Deleted');
        }
    };

    // Events
    const bind = () => {
        document.addEventListener('click', e => {
            const el = e.target.closest('[data-action]');
            if (el && actions[el.dataset.action]) actions[el.dataset.action](el, e);
        });
        document.addEventListener('submit', e => {
            const form = e.target.closest('[data-form]');
            if (!form || !forms[form.dataset.form]) return;
            e.preventDefault();
            forms[form.dataset.form](form);
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeMenu(); closeModal(); return; }
            // Let keyboard users open the clickable cards
            const el = e.target.closest?.('[data-action][role="button"]');
            if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.click(); }
        });
        $('nav-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeMenu(); });
        $('global-search').addEventListener('input', e => {
            query = e.target.value.trim();
            if (!route.startsWith('admin')) render(); // don't wipe half-filled admin forms
        });
        window.addEventListener('popstate', e => {
            route = e.state?.route || new URLSearchParams(location.search).get('route') || 'home';
            closeMenu();
            closeModal();
            render();
        });
    };

    // Init
    const init = async () => {
        bind();
        route = new URLSearchParams(location.search).get('route') || 'home';
        admin = store.get('wishlist-admin', false) === true;
        await load();
        render();
    };

    // Start
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
