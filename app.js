(() => {
    const RANK_WEIGHTS = { S: 4, A: 3, B: 2, C: 1 };
    const PAGE_SIZE_CARDS = 12;
    const PAGE_SIZE_LIST = 18;

    // JSONBin Configuration
    const CONFIG = {
        BIN_ID: "68bd0199ae596e708fe558a8",
        API_KEY: "$2a$10$qCWunkuQ.RvrVSMrdAzXA.h.BWSmvB6NkAIaEXVd5rUQ7E4RzwCyq",
        BASE_URL: "https://api.jsonbin.io/v3/b"
    };

    const getBinUrl = () => `${CONFIG.BASE_URL}/${CONFIG.BIN_ID}`;

    // DOM refs
    const gridEl = document.getElementById('grid');
    const filterBarEl = document.getElementById('filter-bar');
    const tagPillsEl = document.getElementById('tag-pills');
    const paginationEl = document.getElementById('pagination');
    const bannerEl = document.getElementById('banner');
    const homeQuickEl = document.getElementById('home-quick');
    const sectionTitleEl = document.getElementById('section-title');
    const sectionSubtitleEl = document.getElementById('section-subtitle');
    const globalSearchEl = document.getElementById('global-search');
    const addItemBtn = document.getElementById('add-item-btn');
    const viewToggleBtns = document.querySelectorAll('.view-toggle .toggle');
    const sortSelectEl = document.getElementById('sort-select');
    const navButtons = document.querySelectorAll('.nav-item');

    const modalEl = document.getElementById('modal');
    const modalCloseBtn = document.getElementById('modal-close');
    const modalCancelBtn = document.getElementById('modal-cancel');
    const itemForm = document.getElementById('item-form');
    const toastStack = document.getElementById('toast-stack');

    const projectModalEl = document.getElementById('project-modal');
    const projectModalCloseBtn = document.getElementById('project-modal-close');
    const projectCancelBtn = document.getElementById('project-cancel');
    const projectForm = document.getElementById('project-form');
    const projectListEl = document.getElementById('project-list');
    const manageProjectsBtn = document.getElementById('manage-projects-btn');

    // State
    let items = [];
    let projects = [];
    let route = 'overview';
    let view = localStorage.getItem('stashlist:view') || (window.innerWidth <= 768 ? 'list' : 'cards');
    let sort = localStorage.getItem('stashlist:sort') || 'date-desc';
    let page = 1;
    let searchQuery = '';
    const perRouteState = {};

    function getRouteState(r) {
        if (!perRouteState[r]) {
            perRouteState[r] = {
                chips: { price: false, rank: false, project: false },
                filters: { price: 'any', rank: 'any', project: 'all', tags: [] }
            };
        }
        return perRouteState[r];
    }

    // Initialize app
    initApp();

    async function initApp() {
        initFromUrl();
        bindEvents();
        await loadItems();
        render();
    }

    // JSONBin functions
    async function fetchItems() {
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
            throw new Error(`Failed to fetch items: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
            items: data.record.items || [],
            projects: data.record.projects || []
        };
    }

    async function saveData() {
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
            body: JSON.stringify({ items: items, projects: projects })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save data: ${response.status} ${response.statusText}`);
        }
        
        console.log('Data saved successfully');
    }

    async function loadItems() {
        try {
            const data = await fetchItems();
            items = data.items;
            projects = data.projects;
            if (items.length === 0) {
                toast('No items found. Add your first item!');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast('Failed to load data. Check console for details.');
            items = [];
            projects = [];
        }
    }

    function bindEvents() {
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const to = btn.getAttribute('data-route');
                go(to);
            });
        });

        globalSearchEl.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            page = 1;
            render();
        });

        viewToggleBtns.forEach(b => b.addEventListener('click', () => {
            viewToggleBtns.forEach(x => x.classList.remove('is-active'));
            b.classList.add('is-active');
            view = b.getAttribute('data-view');
            localStorage.setItem('stashlist:view', view);
            page = 1;
            render();
        }));

        sortSelectEl.addEventListener('change', (e) => {
            sort = e.target.value;
            localStorage.setItem('stashlist:sort', sort);
            render();
        });

        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const key = chip.getAttribute('data-chip');
                const rs = getRouteState(route);
                rs.chips[key] = !rs.chips[key];
                chip.classList.toggle('is-active', rs.chips[key]);
                renderFilterBar();
            });
        });

        addItemBtn.addEventListener('click', openModal);
        modalCloseBtn.addEventListener('click', closeModal);
        modalCancelBtn.addEventListener('click', closeModal);
        modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modalEl.hasAttribute('hidden')) closeModal(); });

        manageProjectsBtn.addEventListener('click', openProjectModal);
        projectModalCloseBtn.addEventListener('click', closeProjectModal);
        projectCancelBtn.addEventListener('click', closeProjectModal);
        projectModalEl.addEventListener('click', (e) => { if (e.target === projectModalEl) closeProjectModal(); });

        itemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(itemForm);
            const newItem = {
                id: slug(`${fd.get('title')}-${Date.now()}`),
                title: fd.get('title').toString(),
                price: Number(fd.get('price') || 0),
                url: fd.get('url').toString(),
                image: fd.get('image') ? fd.get('image').toString() : '',
                vendor: fd.get('vendor') ? fd.get('vendor').toString() : '',
                rank: fd.get('rank') || 'B',
                projects: fd.get('project') ? [fd.get('project').toString()] : [],
                tags: parseTags(fd.get('tags') || ''),
                notes: fd.get('notes') ? fd.get('notes').toString() : '',
                purchased: false,
                tracked: false,
                dateAdded: new Date().toISOString()
            };
            
            try {
                items.unshift(newItem);
                await saveData();
                closeModal();
                toast('Item added');
                page = 1;
                render();
                itemForm.reset();
            } catch (error) {
                console.error('Error saving item:', error);
                toast('Failed to save item. Check console for details.');
            }
        });

        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(projectForm);
            const newProject = {
                id: slug(`${fd.get('name')}-${Date.now()}`),
                name: fd.get('name').toString(),
                description: fd.get('description').toString(),
                color: fd.get('color').toString(),
                dateCreated: new Date().toISOString()
            };
            
            try {
                projects.push(newProject);
                await saveData();
                closeProjectModal();
                toast('Project added');
                renderProjectList();
                projectForm.reset();
            } catch (error) {
                console.error('Error saving project:', error);
                toast('Failed to save project. Check console for details.');
            }
        });

        window.addEventListener('popstate', () => {
            initFromUrl();
            render();
        });

        // Update view on resize
        window.addEventListener('resize', () => {
            const newView = window.innerWidth <= 768 ? 'list' : 'cards';
            if (newView !== view && !localStorage.getItem('stashlist:view')) {
                view = newView;
                render();
            }
        });
    }

    function go(to) {
        route = to;
        page = 1;
        const url = new URL(location.href);
        url.searchParams.set('route', route);
        history.pushState({}, '', url.toString());
        render();
    }

    function initFromUrl() {
        const url = new URL(location.href);
        route = url.searchParams.get('route') || route;
        view = url.searchParams.get('view') || view;
        sort = url.searchParams.get('sort') || sort;
        page = Number(url.searchParams.get('page') || 1);
        searchQuery = url.searchParams.get('q') || '';
        globalSearchEl.value = searchQuery;
        document.querySelectorAll('.view-toggle .toggle').forEach(b => b.classList.toggle('is-active', b.getAttribute('data-view') === view));
        sortSelectEl.value = sort;
        navButtons.forEach(n => n.classList.toggle('is-active', n.getAttribute('data-route') === route));
    }

    function render() {
        navButtons.forEach(n => n.classList.toggle('is-active', n.getAttribute('data-route') === route));
        document.querySelectorAll('.view-toggle .toggle').forEach(b => b.classList.toggle('is-active', b.getAttribute('data-view') === view));
        renderHeaderForRoute();
        renderFilterBar();
        renderHomeQuick();
        renderContent();
        renderPagination();
        renderTagPills();
        reflectUrl();
    }

    function renderHeaderForRoute() {
        const rs = getRouteState(route);
        sectionSubtitleEl.textContent = '';
        bannerEl.hidden = true;
        switch (route) {
            case 'overview':
                sectionTitleEl.textContent = 'Overview';
                break;
            case 'under-20':
                sectionTitleEl.textContent = 'Under $20';
                bannerEl.textContent = 'Budget gems';
                bannerEl.hidden = false;
                rs.filters.price = 'under-20';
                break;
            case 'under-30':
                sectionTitleEl.textContent = 'Under $30';
                bannerEl.textContent = '$30-ish sweet spot';
                bannerEl.hidden = false;
                rs.filters.price = 'under-30';
                break;
            case 'by-rank':
                sectionTitleEl.textContent = 'By Rank';
                sectionSubtitleEl.textContent = 'S = top priority/impact; C = nice-to-have';
                rs.filters.rank = rs.filters.rank === 'any' ? 'S' : rs.filters.rank;
                sort = 'rank-desc';
                break;
            case 'by-project':
                sectionTitleEl.textContent = 'By Project';
                break;
            case 'projects':
                sectionTitleEl.textContent = 'Projects';
                manageProjectsBtn.style.display = 'inline-block';
                break;
            case 'purchased':
                sectionTitleEl.textContent = 'Purchased';
                break;
            case 'components':
                sectionTitleEl.textContent = 'Component Library';
                break;
        }
        sortSelectEl.value = sort;
    }

    function renderFilterBar() {
        const rs = getRouteState(route);
        const visible = Object.values(rs.chips).some(Boolean) || route === 'by-rank' || route === 'by-project';
        if (!visible) {
            filterBarEl.innerHTML = '';
            return;
        }

        const priceSelect = `
            <label>Price
                <select id="price-filter">
                    <option value="any">Any</option>
                    <option value="under-20">Under $20</option>
                    <option value="range-25-35">$25–$35</option>
                    <option value="range-20-50">$20–$50</option>
                    <option value="range-50-100">$50–$100</option>
                </select>
            </label>`;

        const rankSelect = `
            <label>Rank
                <select id="rank-filter">
                    <option value="any">Any</option>
                    <option value="S">S</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                </select>
            </label>`;

        const projects = uniqueProjects(items);
        const projectSelect = `
            <label>Project
                <select id="project-filter">
                    <option value="all">All</option>
                    ${projects.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')}
                </select>
            </label>`;

        const rankSegmented = route === 'by-rank' ? `
            <div class="segmented" id="rank-segmented" role="group" aria-label="Rank">
                ${['S','A','B','C'].map(r => `<button class="btn ${rs.filters.rank===r?'btn-primary':''}" data-rank="${r}">${r}</button>`).join('')}
            </div>` : '';

        const byProjectLeft = route === 'by-project' ? renderProjectsList() : '';
        const controlsRow = `
            <div class="filter-controls">
                ${rs.chips.price ? priceSelect : ''}
                ${rs.chips.rank ? rankSelect : ''}
                ${rs.chips.project ? projectSelect : ''}
                ${rankSegmented}
            </div>`;

        filterBarEl.innerHTML = `${byProjectLeft}${controlsRow}`;

        const priceSel = document.getElementById('price-filter'); if (priceSel) priceSel.value = rs.filters.price;
        const rankSel = document.getElementById('rank-filter'); if (rankSel) rankSel.value = rs.filters.rank;
        const projSel = document.getElementById('project-filter'); if (projSel) projSel.value = rs.filters.project;

        if (priceSel) priceSel.addEventListener('change', (e) => { rs.filters.price = e.target.value; page = 1; render(); });
        if (rankSel) rankSel.addEventListener('change', (e) => { rs.filters.rank = e.target.value; page = 1; render(); });
        if (projSel) projSel.addEventListener('change', (e) => { rs.filters.project = e.target.value; page = 1; render(); });

        if (route === 'by-rank') {
            const seg = document.getElementById('rank-segmented');
            if (seg) seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
                rs.filters.rank = b.getAttribute('data-rank');
                renderFilterBar();
                renderContent();
                renderPagination();
            }));
        }
    }

    function renderProjectsList() {
        const counts = projectCounts(items);
        const rs = getRouteState(route);
        const total = Object.values(counts).reduce((a,b) => a + b, 0) || 1;
        const list = Object.keys(counts).map(p => {
            const n = counts[p];
            const pct = Math.round((n / total) * 100);
            return `
            <div class="projects-list">
                ${Object.keys(counts).map(pr => {
                    const nn = counts[pr];
                    const pc = Math.round((nn/total)*100);
                    const active = rs.filters.project === pr ? 'is-active' : '';
                    return `<div class="project-item ${active}" data-project="${escapeHtml(pr)}">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                            <span>${escapeHtml(pr)}</span>
                            <span class="count" style="color:var(--text-muted)">${nn}</span>
                        </div>
                        <div class="progress"><span style="width:${pc}%"></span></div>
                    </div>`;
                }).join('')}
            </div>`;
        }).join('');
        setTimeout(() => {
            document.querySelectorAll('.project-item').forEach(el => el.addEventListener('click', () => {
                const rs2 = getRouteState('by-project');
                rs2.filters.project = el.getAttribute('data-project');
                render();
            }));
        }, 0);
        return list;
    }

    function renderContent() {
        if (route === 'components') return renderComponentsPage();
        if (route === 'projects') return renderProjectsPage();

        // Show quick-nav on Overview instead of items
        if (route === 'overview') {
            gridEl.innerHTML = '';
            return;
        }

        const rs = getRouteState(route);
        let list = items.slice();

        // Route-specific defaults
        if (route === 'under-20') rs.filters.price = 'under-20';
        if (route === 'under-30') rs.filters.price = 'under-30';

        // Purchased route
        if (route === 'purchased') list = list.filter(i => i.purchased);

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(i =>
                i.title.toLowerCase().includes(q) ||
                (i.vendor || '').toLowerCase().includes(q) ||
                (i.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }

        // Filters
        list = list.filter(i => matchesPrice(i.price, rs.filters.price));
        if (rs.filters.rank !== 'any') list = list.filter(i => i.rank === rs.filters.rank);
        if (rs.filters.project !== 'all') list = list.filter(i => (i.projects || []).includes(rs.filters.project));
        if (rs.filters.tags?.length) list = list.filter(i => rs.filters.tags.every(t => (i.tags||[]).includes(t)));

        // Sort
        list = sortItems(list, sort);

        // Pagination
        const size = view === 'list' ? PAGE_SIZE_LIST : PAGE_SIZE_CARDS;
        const totalPages = Math.max(1, Math.ceil(list.length / size));
        page = Math.min(page, totalPages);
        const start = (page - 1) * size;
        const visible = list.slice(start, start + size);

        // Render
        gridEl.classList.toggle('list', view === 'list');
        gridEl.innerHTML = '';

        if (route === 'by-project') {
            // Show only items for selected project on the right grid
        }

        if (visible.length === 0) {
            gridEl.innerHTML = emptyStateHtml();
            return;
        }

        sectionTitleEl.innerHTML = `${sectionTitleEl.textContent.split(' (')[0]} <span class="count">(${list.length})</span>`;
        visible.forEach(item => {
            const el = view === 'list' ? renderItemRow(item) : renderItemCard(item);
            gridEl.appendChild(el);
        });
    }

    function renderPagination() {
        const rs = getRouteState(route);
        let list = items.slice();
        if (route === 'purchased') list = list.filter(i => i.purchased);
        list = list.filter(i => matchesPrice(i.price, rs.filters.price));
        if (rs.filters.rank !== 'any') list = list.filter(i => i.rank === rs.filters.rank);
        if (rs.filters.project !== 'all') list = list.filter(i => (i.projects || []).includes(rs.filters.project));
        if (searchQuery) list = list.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()) || (i.vendor||'').toLowerCase().includes(searchQuery.toLowerCase()) || (i.tags||[]).some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
        list = sortItems(list, sort);
        const size = view === 'list' ? PAGE_SIZE_LIST : PAGE_SIZE_CARDS;
        const totalPages = Math.max(1, Math.ceil(list.length / size));

        if (totalPages <= 1) { paginationEl.hidden = true; paginationEl.innerHTML=''; return; }
        paginationEl.hidden = false;
        let html = '';
        for (let p = 1; p <= totalPages; p++) {
            html += `<button class="page-btn ${p===page?'is-active':''}" data-page="${p}">${p}</button>`;
        }
        paginationEl.innerHTML = html;
        paginationEl.querySelectorAll('.page-btn').forEach(b => b.addEventListener('click', () => { page = Number(b.getAttribute('data-page')); renderContent(); renderPagination(); reflectUrl(); scrollToTop(); }));
    }

    function renderTagPills() {
        const rs = getRouteState(route);
        const tags = rs.filters.tags || [];
        if (!tags.length) { tagPillsEl.innerHTML = ''; return; }
        tagPillsEl.innerHTML = tags.map(t => `<span class="pill">${escapeHtml(t)} <span class="x" data-tag="${escapeHtml(t)}">×</span></span>`).join('');
        tagPillsEl.querySelectorAll('.x').forEach(x => x.addEventListener('click', () => {
            rs.filters.tags = rs.filters.tags.filter(t => t !== x.getAttribute('data-tag'));
            page = 1; render();
        }));
    }

    function renderItemCard(item) {
        const card = document.createElement('div');
        card.className = `item-card ${item.tracked ? 'is-selected' : ''} ${item.purchased ? 'is-purchased' : ''}`;
        const img = item.image || `https://picsum.photos/seed/${encodeURIComponent(item.id)}/512/512`;
        card.innerHTML = `
            <div class="card-media"><img alt="${escapeHtml(item.title)}" src="${img}"></div>
            <div class="card-body">
                <div class="title-row">
                    <div class="item-title">${escapeHtml(item.title)}</div>
                    <div class="price">$${item.price.toFixed(2)}</div>
                </div>
                <div class="meta-row">
                    <span class="vendor-chip">${escapeHtml(item.vendor || 'Vendor')}</span>
                    <span class="rank-badge rank-${item.rank}">${item.rank}</span>
                </div>
                <div class="tags">${(item.projects||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')} ${(item.tags||[]).slice(0,2).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
                <div class="cta-row">
                    <div class="ctas">
                        <a class="btn-secondary" href="${item.url}" target="_blank" rel="noopener">Open Link</a>
                        <button class="btn btn-primary" data-track="${item.id}">${item.tracked ? 'Tracked' : 'Track'}</button>
                    </div>
                    <button class="overflow" aria-label="More">⋯</button>
                </div>
            </div>`;
        card.querySelector('[data-track]').addEventListener('click', async () => {
            item.tracked = !item.tracked;
            try {
                await saveData();
                renderContent();
            } catch (error) {
                console.error('Error saving track state:', error);
                toast('Failed to save changes');
            }
        });
        return card;
    }

    function renderItemRow(item) {
        const row = document.createElement('div');
        row.className = 'item-row';
        const img = item.image || `https://picsum.photos/seed/${encodeURIComponent(item.id)}/128/128`;
        row.innerHTML = `
            <div class="thumb-56"><img alt="${escapeHtml(item.title)}" src="${img}"></div>
            <div style="display:flex;flex-direction:column;gap:4px;min-width:0;">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span class="item-title" style="flex:1;min-width:0;">${escapeHtml(item.title)}</span>
                    <span class="rank-badge rank-${item.rank}">${item.rank}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span class="vendor-chip">${escapeHtml(item.vendor || 'Vendor')}</span>
                    <div class="price">$${item.price.toFixed(2)}</div>
                </div>
                <div class="tags">${(item.projects||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')} ${(item.tags||[]).slice(0,2).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                <a class="btn-secondary" href="${item.url}" target="_blank" rel="noopener">Open</a>
                <button class="btn btn-primary" data-track="${item.id}">${item.tracked ? 'Tracked' : 'Track'}</button>
            </div>`;
        row.querySelector('[data-track]').addEventListener('click', async () => {
            item.tracked = !item.tracked;
            try {
                await saveData();
                renderContent();
            } catch (error) {
                console.error('Error saving track state:', error);
                toast('Failed to save changes');
            }
        });
        return row;
    }

    function renderComponentsPage() {
        gridEl.innerHTML = '';
        const demo = items.slice(0, 4);
        demo.forEach((i, idx) => {
            const c = renderItemCard(i);
            if (idx === 1) c.classList.add('is-selected');
            if (idx === 2) i.rank = 'C';
            gridEl.appendChild(c);
        });
        const chip = document.createElement('div');
        chip.innerHTML = `
            <div class="tags" style="margin-top:8px;">${['Arcade Cabinet','Tesla Mods','Garage Upgrade'].map(t => `<span class=tag>${t}</span>`).join('')}</div>`;
        gridEl.appendChild(chip);
    }

    function reflectUrl() {
        const url = new URL(location.href);
        url.searchParams.set('route', route);
        url.searchParams.set('view', view);
        url.searchParams.set('sort', sort);
        url.searchParams.set('page', String(page));
        if (searchQuery) url.searchParams.set('q', searchQuery); else url.searchParams.delete('q');
        history.replaceState({}, '', url.toString());
    }

    function scrollToTop() {
        document.getElementById('main').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function emptyStateHtml() {
        return `
            <div style=\"grid-column:1/-1; display:grid; place-items:center; padding:40px;\">
                <div class=\"empty\" style=\"text-align:center; color:var(--text-muted);\">
                    <div style=\"font-size:40px;\">🪴</div>
                    <h3 style=\"margin:8px 0 4px; color:var(--text)\">Nothing here yet—plant a new idea.</h3>
                    <p style=\"margin-bottom:12px\">Add your first item to get started.</p>
                    <button class=\"btn btn-primary\" onclick=\"document.getElementById('add-item-btn').click()\">Add Item</button>
                </div>
            </div>`;
    }

    function matchesPrice(price, filter) {
        switch (filter) {
            case 'under-20': return price <= 20;
            case 'under-30': return price <= 30;
            case 'range-20-50': return price >= 20 && price <= 50;
            case 'range-50-100': return price >= 50 && price <= 100;
            default: return true;
        }
    }

    function sortItems(list, by) {
        const copy = list.slice();
        switch (by) {
            case 'price-asc':
                return copy.sort((a,b) => a.price - b.price);
            case 'price-desc':
                return copy.sort((a,b) => b.price - a.price);
            case 'rank-desc':
                return copy.sort((a,b) => (RANK_WEIGHTS[b.rank]||0) - (RANK_WEIGHTS[a.rank]||0));
            case 'date-desc':
            default:
                return copy.sort((a,b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        }
    }

    function uniqueProjects(arr) {
        const set = new Set();
        arr.forEach(i => (i.projects||[]).forEach(p => set.add(p)));
        return Array.from(set);
    }

    function projectCounts(arr) {
        const map = {};
        arr.forEach(i => (i.projects||[]).forEach(p => { map[p] = (map[p]||0) + 1; }));
        return map;
    }

    function openModal() {
        modalEl.removeAttribute('hidden');
        modalEl.setAttribute('aria-hidden', 'false');
        setTimeout(() => itemForm.querySelector('input[name="title"]').focus(), 0);
    }

    function closeModal() {
        modalEl.setAttribute('hidden', 'true');
        modalEl.setAttribute('aria-hidden', 'true');
    }

    function toast(message) {
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = message;
        toastStack.appendChild(t);
        setTimeout(() => { t.remove(); }, 2500);
    }

    function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
    function parseTags(v) { return v.toString().split(',').map(x => x.trim()).filter(Boolean); }
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }


    function renderHomeQuick() {
        if (route !== 'overview') { homeQuickEl.hidden = true; homeQuickEl.innerHTML = ''; return; }
        homeQuickEl.hidden = false;
        homeQuickEl.innerHTML = `
            <div class="quick-card" data-go="under-20">
                <div class="quick-circle">$20</div>
                <div class="quick-label">Under $20</div>
            </div>
            <div class="quick-card" data-go="under-30">
                <div class="quick-circle">$30</div>
                <div class="quick-label">Under $30</div>
            </div>
            <div class="quick-card" data-go="by-rank">
                <div class="quick-circle">S/A</div>
                <div class="quick-label">By Rank</div>
            </div>
            <div class="quick-card" data-go="by-project">
                <div class="quick-circle">📁</div>
                <div class="quick-label">By Project</div>
            </div>`;
        homeQuickEl.querySelectorAll('.quick-card').forEach(c => c.addEventListener('click', () => go(c.getAttribute('data-go'))));
    }

    function renderProjectsPage() {
        gridEl.innerHTML = '';
        if (projects.length === 0) {
            gridEl.innerHTML = `
                <div style="grid-column:1/-1; display:grid; place-items:center; padding:40px;">
                    <div class="empty" style="text-align:center; color:var(--text-muted);">
                        <div style="font-size:40px;">🗂️</div>
                        <h3 style="margin:8px 0 4px; color:var(--text)">No projects yet</h3>
                        <p style="margin-bottom:12px">Create your first project to organize items.</p>
                        <button class="btn btn-primary" onclick="document.getElementById('manage-projects-btn').click()">Manage Projects</button>
                    </div>
                </div>`;
            return;
        }

        projects.forEach(project => {
            const projectItems = items.filter(item => (item.projects || []).includes(project.name));
            const trackedItems = projectItems.filter(item => item.tracked);
            const purchasedItems = projectItems.filter(item => item.purchased);
            
            const projectEl = document.createElement('div');
            projectEl.className = 'project-card';
            projectEl.innerHTML = `
                <div class="project-header">
                    <div class="project-name">
                        <div class="project-color" style="background-color: ${project.color}"></div>
                        <span>${escapeHtml(project.name)}</span>
                    </div>
                    <div class="project-stats">
                        <span>${projectItems.length} items</span>
                        <span>${trackedItems.length} tracked</span>
                        <span>${purchasedItems.length} purchased</span>
                    </div>
                </div>
                <div class="project-description">${escapeHtml(project.description || 'No description')}</div>
                <div class="project-items">
                    ${projectItems.slice(0, 3).map(item => `
                        <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:14px;">
                            <span class="rank-badge rank-${item.rank}">${item.rank}</span>
                            <span>${escapeHtml(item.title)}</span>
                            <span style="color:var(--text-muted);">$${item.price.toFixed(2)}</span>
                        </div>
                    `).join('')}
                    ${projectItems.length > 3 ? `<div style="color:var(--text-muted);font-size:12px;">+${projectItems.length - 3} more items</div>` : ''}
                </div>
            `;
            gridEl.appendChild(projectEl);
        });
    }

    function renderProjectList() {
        projectListEl.innerHTML = '';
        projects.forEach(project => {
            const projectItems = items.filter(item => (item.projects || []).includes(project.name));
            const projectEl = document.createElement('div');
            projectEl.className = 'project-card';
            projectEl.innerHTML = `
                <div class="project-header">
                    <div class="project-name">
                        <div class="project-color" style="background-color: ${project.color}"></div>
                        <span>${escapeHtml(project.name)}</span>
                    </div>
                    <div class="project-actions">
                        <button onclick="editProject('${project.id}')" class="btn btn-ghost">Edit</button>
                        <button onclick="deleteProject('${project.id}')" class="btn btn-ghost" style="color: #e74c3c;">Delete</button>
                    </div>
                </div>
                <div class="project-description">${escapeHtml(project.description || 'No description')}</div>
                <div class="project-stats">
                    <span>${projectItems.length} items</span>
                    <span>Created ${new Date(project.dateCreated).toLocaleDateString()}</span>
                </div>
            `;
            projectListEl.appendChild(projectEl);
        });
    }

    function openProjectModal() {
        projectModalEl.removeAttribute('hidden');
        projectModalEl.setAttribute('aria-hidden', 'false');
        renderProjectList();
    }

    function closeProjectModal() {
        projectModalEl.setAttribute('hidden', 'true');
        projectModalEl.setAttribute('aria-hidden', 'true');
    }

    async function deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project? This will remove it from all items.')) return;
        
        try {
            projects = projects.filter(p => p.id !== projectId);
            // Remove project from all items
            items.forEach(item => {
                if (item.projects) {
                    item.projects = item.projects.filter(p => p !== projects.find(pr => pr.id === projectId)?.name);
                }
            });
            await saveData();
            renderProjectList();
            render();
            toast('Project deleted');
        } catch (error) {
            console.error('Error deleting project:', error);
            toast('Failed to delete project');
        }
    }

    function editProject(projectId) {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        
        // For now, just show a simple prompt - you could expand this to a full edit modal
        const newName = prompt('Project name:', project.name);
        if (newName && newName !== project.name) {
            const oldName = project.name;
            project.name = newName;
            // Update all items that reference this project
            items.forEach(item => {
                if (item.projects) {
                    const index = item.projects.indexOf(oldName);
                    if (index !== -1) {
                        item.projects[index] = newName;
                    }
                }
            });
            saveData();
            renderProjectList();
            render();
            toast('Project updated');
        }
    }

    // Make functions globally available
    window.deleteProject = deleteProject;
    window.editProject = editProject;
})();

