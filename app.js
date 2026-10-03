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
        open: 'sounds/super_mario_bros_mushroom_sound_effect_58k.mp3',
        secret: 'sounds/ringtones-zelda-1.mp3',
        purchase: 'sounds/zelda-chest-opening-and-item-catch.mp3'
    };
    const TIERS = { S: ['Dream', 'Dream gift'], A: ['Want', 'Really want'], B: ['Like', 'Would like'], C: ['Maybe', 'Nice to have'] };

    // State
    let route = 'list', query = '', admin = false, adminTab = 'items';
    let budget = 0, project = '', showBought = false;
    let record = {}, items = [], projects = [];
    let taps = 0, lastTap = 0;
    let sheetId = null, sheetMode = 'view', justBought = null;

    // Utils
    const $ = id => document.getElementById(id);
    const $$ = sel => document.querySelectorAll(sel);
    const toast = msg => {
        const stack = $('toast-stack');
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        stack.appendChild(el);
        // Re-open as a popover so toasts land in the top layer, above an open item sheet
        try { if (stack.matches(':popover-open')) stack.hidePopover(); stack.showPopover(); } catch {}
        setTimeout(() => {
            el.remove();
            if (!stack.children.length) try { stack.hidePopover(); } catch {}
        }, 3000);
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

    // URL: filters and the open item live in the query string so any view can be shared as a link
    const readUrl = () => {
        const p = new URLSearchParams(location.search);
        const r = p.get('route') || '';
        route = r === 'admin' || r === 'admin-login' ? r : 'list';
        budget = Number(p.get('budget')) || 0;
        project = p.get('project') || '';
        showBought = p.get('bought') === '1';
        // Links from the old multi-page version of the site
        if (r === 'under-20') budget = 20;
        if (r === '30-items') budget = 30;
        if (r === 'purchased') showBought = true;
        if (r.startsWith('project-')) project = r.slice('project-'.length);
        return p.get('item');
    };

    const writeUrl = (push, item = sheetId) => {
        try {
            const p = new URLSearchParams();
            if (route !== 'list') p.set('route', route);
            else {
                if (budget) p.set('budget', budget);
                if (project) p.set('project', project);
                if (showBought) p.set('bought', '1');
                if (item) p.set('item', item);
            }
            const qs = p.toString();
            history[push ? 'pushState' : 'replaceState']({ sheet: Boolean(push && item) }, '', location.pathname + (qs ? `?${qs}` : ''));
        } catch {} // some browsers refuse history updates on file:// pages
    };

    const go = to => {
        if (to === 'admin' && !admin) to = 'admin-login';
        if (route === to) return;
        route = to;
        writeUrl(true, null);
        window.scrollTo(0, 0);
        render();
    };

    // Rendering helpers
    const money = n => `$${n % 1 ? n.toFixed(2) : n}`;
    const projectOf = it => projects.find(p => p.id === it.project);
    const glyph = (it, hidden) => `<span class="tile-glyph" aria-hidden="true"${hidden ? ' hidden' : ''}>${esc(projectOf(it)?.icon || '🎁')}</span>`;
    const media = (it, alt = '') => {
        const img = safeUrl(it.image);
        return img
            ? `<img src="${esc(img)}" alt="${esc(alt)}" loading="lazy" onerror="this.nextElementSibling.hidden=false; this.remove()">${glyph(it, true)}`
            : glyph(it);
    };
    const matches = i => !query || `${i.title} ${i.vendor} ${projectOf(i)?.name || ''}`.toLowerCase().includes(query.toLowerCase());
    const inFilters = i => (!budget || i.price <= budget) && (!project || i.project === project) && matches(i);
    const filtered = () => Boolean(budget || project || query);

    // The tier list
    const tile = it => `<button class="tile${it.purchased ? ' is-bought' : ''}" data-action="open" data-id="${esc(it.id)}"
        aria-label="${esc(it.title)}, ${money(it.price)}${it.purchased ? ', already bought' : ''}">${media(it)}<span class="tag">${it.purchased ? 'Bought' : money(it.price)}</span></button>`;

    const renderTiers = () => {
        const shown = items.filter(inFilters);
        const open = shown.filter(i => !i.purchased).length;
        const bought = shown.length - open;
        const empty = filtered() ? 'Nothing here with these filters' : 'Nothing here yet';

        $('tiers').innerHTML = RANKS.map(r => {
            const row = shown.filter(i => i.rank === r && (showBought || !i.purchased))
                .sort((a, b) => (a.purchased - b.purchased) || (a.price - b.price));
            return `<div class="tier" role="group" aria-label="${r} tier, ${TIERS[r][1]}">
                <div class="tier-label tier-${r}"><span class="tier-badge"><span class="tier-letter">${r}</span><span class="tier-word">${TIERS[r][0]}</span></span></div>
                <div class="tier-items">${row.length ? row.map(tile).join('') : `<p class="tier-empty">${empty}</p>`}</div></div>`;
        }).join('');

        const proj = projects.find(p => p.id === project);
        const where = `${budget ? ` up to $${budget}` : ''}${proj ? ` in ${proj.name}` : ''}${query ? ` matching “${query}”` : ''}`;
        $('summary').textContent = open ? `${open} gift idea${open === 1 ? '' : 's'}${where}` : `No gift ideas${where}`;
        $('clear-filters').hidden = !filtered();

        const note = proj && proj.description !== 'Auto-created' ? proj.description : '';
        $('project-note').textContent = note;
        $('project-note').hidden = !note;

        const toggle = $('toggle-bought');
        toggle.hidden = !bought;
        toggle.textContent = showBought ? `Hide the ${bought} already bought` : `Show ${bought} already bought`;
    };

    let chipKey = '';
    const renderChips = () => {
        const openCount = id => items.filter(i => i.project === id && !i.purchased).length;
        const sorted = [...projects].sort((a, b) => openCount(b.id) - openCount(a.id));
        const key = sorted.map(p => `${p.id}:${p.name}:${p.icon}`).join('|');
        if (key !== chipKey) { // only rebuild when projects change, so keyboard focus stays put
            chipKey = key;
            $('project-chips').innerHTML = `<button class="chip" data-action="project" data-project="">All projects</button>` +
                sorted.map(p => `<button class="chip" data-action="project" data-project="${esc(p.id)}">${esc(p.icon)} ${esc(p.name)}</button>`).join('');
        }
        $$('[data-action="budget"]').forEach(c => c.setAttribute('aria-pressed', String((Number(c.dataset.budget) || 0) === budget)));
        $$('[data-action="project"]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.project === project)));
    };

    // Item sheet
    const sheet = $('sheet');

    const renderSheet = () => {
        const it = items.find(i => i.id === sheetId);
        if (!it) return sheet.close();
        const link = safeUrl(it.url), vendor = it.vendor || hostOf(link);
        const proj = projectOf(it);
        const view = link ? `<a class="btn ${it.purchased ? 'btn-quiet' : 'btn-primary'}" href="${esc(link)}" target="_blank" rel="noopener noreferrer">View at ${esc(vendor || 'the store')}</a>` : '';
        const actions = it.purchased
            ? `<p class="sheet-note"><strong>Someone is already getting this one.</strong> Pick another gift so it isn't bought twice.</p>${view}`
            : sheetMode === 'confirm'
                ? `<p class="sheet-note"><strong>Mark this as bought?</strong> Everyone else will see it's taken, so nobody buys it twice.</p>
                   <div class="btn-row"><button class="btn btn-primary" data-action="confirm-buy">Yes, mark as bought</button><button class="btn btn-quiet" data-action="cancel-buy">Cancel</button></div>`
                : `${view}<button class="btn btn-outline" data-action="buy">Mark as bought</button>`;

        sheet.innerHTML = `<div class="sheet-media">${media(it, it.title)}
                <span class="sheet-tier"><span class="tier-letter tier-${it.rank}">${it.rank}</span>${TIERS[it.rank][1]}</span>
                ${it.purchased ? `<span class="stamp${justBought === it.id ? ' is-new' : ''}">Bought</span>` : ''}
                <button class="sheet-close" data-action="close-sheet" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </div>
            <div class="sheet-body">
                <h2 class="sheet-title" id="sheet-title">${esc(it.title)}</h2>
                <p class="sheet-price">${money(it.price)}</p>
                ${vendor || proj ? `<p class="sheet-meta">${vendor ? `From ${esc(vendor)}` : ''}${vendor && proj ? ', for' : proj ? 'For' : ''}${proj ? ` my ${esc(proj.name)} project` : ''}</p>` : ''}
                <div class="sheet-actions">${actions}</div>
            </div>`;
    };

    const openSheet = (id, push = true) => {
        if (!items.some(i => i.id === id)) return;
        sheetId = id;
        sheetMode = 'view';
        justBought = null;
        renderSheet();
        if (!sheet.open) sheet.showModal();
        if (push) writeUrl(true, id);
    };

    const confirmBuy = async btn => {
        const id = sheetId;
        btn.disabled = true;
        btn.textContent = 'Saving…';
        try {
            let outcome = 'bought';
            await mutate(rec => {
                const it = rec.items.find(i => i.id === id);
                if (!it || it.purchased) { outcome = it ? 'taken' : 'gone'; return false; }
                it.purchased = true;
            });
            sheetMode = 'view';
            render();
            if (outcome === 'bought') {
                justBought = id;
                sfx(SFX.purchase);
                toast('Marked as bought. Thank you!');
            } else {
                toast(outcome === 'taken' ? 'Someone already bought this one.' : 'That gift was taken off the list.');
            }
            if (sheet.open) renderSheet();
        } catch {
            btn.disabled = false;
            btn.textContent = 'Yes, mark as bought';
            toast(SAVE_FAIL);
        }
    };

    // Admin
    const loginView = () => `<form class="panel panel-narrow" data-form="login">
            <h3>Admin</h3>
            <div class="form-grid">
                <div class="field"><label for="admin-pass">Password</label><input id="admin-pass" type="password" class="input" autocomplete="current-password"></div>
                <p id="admin-error" class="form-error" hidden>That password isn't right.</p>
                <button type="submit" class="btn btn-primary">Log in</button>
                <button type="button" class="text-btn" data-action="go" data-route="list">Back to the list</button>
            </div>
        </form>`;

    const adminItems = () => {
        const projOpts = projects.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
        return `<form class="panel" data-form="add-item"><h3>Add a gift</h3>
            <div class="form-grid two">
                <div class="field wide"><label for="n-name">Name</label><input id="n-name" class="input"></div>
                <div class="field"><label for="n-price">Price</label><input id="n-price" type="number" min="0" step="any" class="input" value="0"></div>
                <div class="field"><label for="n-vendor">Store</label><input id="n-vendor" class="input" placeholder="Amazon"></div>
                <div class="field"><label for="n-proj">Project</label><select id="n-proj" class="input"><option value="">None</option>${projOpts}</select></div>
                <div class="field"><label for="n-rank">Tier</label><select id="n-rank" class="input">${RANKS.map(r => `<option value="${r}"${r === 'A' ? ' selected' : ''}>${r}: ${TIERS[r][1]}</option>`).join('')}</select></div>
                <div class="field wide"><label for="n-url">Link to the item</label><input id="n-url" class="input" placeholder="https://"></div>
                <div class="field wide"><label for="n-image">Image link</label><input id="n-image" class="input" placeholder="https://"></div>
                <label class="field-check wide"><input id="n-purchased" type="checkbox"> Already bought</label>
                <div class="wide"><button type="submit" class="btn btn-primary">Add gift</button></div>
            </div></form>
            <div class="panel"><h3>Gifts (${items.length})</h3><div class="admin-list">
            ${items.map(it => `<div class="admin-row"><div><div class="admin-row-title">${esc(it.title)}</div>
                <div class="admin-row-sub">${it.rank} tier, ${money(it.price)}${it.purchased ? ', bought' : ''}</div></div>
                <button class="btn btn-quiet" data-action="del-item" data-id="${esc(it.id)}">Delete</button></div>`).join('')}</div></div>`;
    };

    const adminProjects = () => `<form class="panel" data-form="add-proj"><h3>Add a project</h3>
            <div class="form-grid two">
                <div class="field wide"><label for="p-name">Name</label><input id="p-name" class="input"></div>
                <div class="field wide"><label for="p-desc">Description</label><textarea id="p-desc" class="input"></textarea></div>
                <div class="field"><label for="p-icon">Icon</label><input id="p-icon" class="input" value="📦"></div>
                <div class="field"><label for="p-color">Color</label><input id="p-color" class="input" value="${DEFAULT_COLOR}"></div>
                <div class="wide"><button type="submit" class="btn btn-primary">Add project</button></div>
            </div></form>
            <div class="panel"><h3>Projects (${projects.length})</h3><div class="admin-list">
            ${projects.map(p => `<div class="admin-row"><div><div class="admin-row-title">${esc(p.icon)} ${esc(p.name)}</div>
                <div class="admin-row-sub">${items.filter(i => i.project === p.id).length} gifts</div></div>
                <button class="btn btn-quiet" data-action="del-proj" data-id="${esc(p.id)}">Delete</button></div>`).join('')}</div></div>`;

    const adminSettings = () => `<form class="panel panel-narrow" data-form="change-pass"><h3>Change password</h3>
            <div class="form-grid">
                <div class="field"><label for="new-pass">New password</label><input id="new-pass" type="password" class="input" autocomplete="new-password"></div>
                <button type="submit" class="btn btn-primary">Change password</button>
            </div></form>`;

    const ADMIN_TABS = { items: ['Gifts', adminItems], projects: ['Projects', adminProjects], settings: ['Password', adminSettings] };

    const adminView = () => `<div class="admin-bar"><h2>Admin</h2>
            <div class="admin-bar-actions"><button class="text-btn" data-action="go" data-route="list">View list</button>
            <button class="btn btn-outline" data-action="logout">Log out</button></div></div>
            <div class="admin-tabs">${Object.entries(ADMIN_TABS).map(([key, [label]]) =>
                `<button class="chip" data-action="tab" data-tab="${key}" aria-pressed="${adminTab === key}">${label}</button>`).join('')}</div>
            ${(ADMIN_TABS[adminTab] || ADMIN_TABS.items)[1]()}`;

    const render = () => {
        if (route === 'admin' && !admin) route = 'admin-login';
        if (project && !projects.some(p => p.id === project)) project = '';
        const onList = route === 'list';
        $('list-view').hidden = !onList;
        $('admin-view').hidden = onList;
        if (onList) {
            $('admin-view').innerHTML = '';
            renderChips();
            renderTiers();
        } else {
            $('admin-view').innerHTML = route === 'admin' ? adminView() : loginView();
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
            try { ok = Boolean(entered) && await checkPass(entered); } catch {
                return toast(window.isSecureContext ? "Can't check the password right now. Try again once you're online." : 'Admin login needs an https:// connection.');
            }
            if (!ok) return void ($('admin-error').hidden = false);
            sfx(SFX.secret);
            admin = true;
            store.set('wishlist-admin', true);
            go('admin');
        },
        'add-item': async () => {
            const title = $('n-name').value.trim();
            if (!title) return toast('Give the gift a name first.');
            const fields = {
                title, price: toPrice($('n-price').value), vendor: $('n-vendor').value.trim(), project: $('n-proj').value,
                rank: $('n-rank').value || 'A', image: $('n-image').value.trim(), url: $('n-url').value.trim(), purchased: $('n-purchased').checked
            };
            await saveAndRender(rec => { rec.items.push({ id: uniqueId(slug(title), new Set(rec.items.map(i => i.id))), ...fields }); }, 'Gift added');
        },
        'add-proj': async () => {
            const name = $('p-name').value.trim();
            if (!name) return toast('Give the project a name first.');
            const fields = { name, description: $('p-desc').value.trim(), icon: $('p-icon').value || '📦', color: $('p-color').value.trim() };
            await saveAndRender(rec => { rec.projects.push({ id: uniqueId(slug(name), new Set(rec.projects.map(p => p.id))), ...fields }); }, 'Project added');
        },
        'change-pass': async () => {
            const pass = $('new-pass').value.trim();
            if (pass.length < 6) return toast('Use at least 6 characters.');
            let auth;
            try { auth = await makeAuth(pass); } catch { return toast('Admin login needs an https:// connection.'); }
            await saveAndRender(setAuth(auth), 'Password changed');
        }
    };

    const actions = {
        open: el => { sfx(SFX.open); openSheet(el.dataset.id); },
        'close-sheet': () => sheet.close(),
        buy: () => { sheetMode = 'confirm'; renderSheet(); sheet.querySelector('[data-action="confirm-buy"]').focus(); },
        'cancel-buy': () => { sheetMode = 'view'; renderSheet(); },
        'confirm-buy': el => { if (!el.disabled) confirmBuy(el); },
        budget: el => { budget = Number(el.dataset.budget) || 0; writeUrl(false); render(); },
        project: el => { project = el.dataset.project; writeUrl(false); render(); },
        'clear-filters': () => { budget = 0; project = ''; query = ''; $('search').value = ''; writeUrl(false); render(); },
        'toggle-bought': () => { showBought = !showBought; writeUrl(false); render(); },
        'secret-tap': () => {
            const now = Date.now();
            if (now - lastTap > 2000) taps = 0;
            lastTap = now;
            if (++taps >= 5) { taps = 0; sfx(SFX.secret); go('admin'); }
        },
        go: el => go(el.dataset.route),
        logout: () => { admin = false; store.del('wishlist-admin'); go('list'); },
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
        $('search').addEventListener('input', e => { query = e.target.value.trim(); renderTiers(); });
        // Tapping the dimmed backdrop closes the sheet
        sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
        sheet.addEventListener('close', () => {
            sheetId = null;
            if (!new URLSearchParams(location.search).has('item')) return;
            if (history.state?.sheet) history.back(); else writeUrl(false, null);
        });
        window.addEventListener('popstate', () => {
            const item = readUrl();
            if (sheet.open && !item) sheet.close();
            render();
            if (item && route === 'list') openSheet(item, false);
        });
    };

    // Init
    const init = async () => {
        const item = readUrl();
        bind();
        admin = store.get('wishlist-admin', false) === true;
        await load();
        render();
        if (item && route === 'list') openSheet(item, false);
    };

    // Start
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
