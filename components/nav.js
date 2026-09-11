// Carbonated Audio — Shared Navigation Component
// Usage: <div id="site-nav" data-active="home|carbonator|desipper"></div>
//        <script src="/components/nav.js"></script>

(function() {
    const mount = document.getElementById('site-nav');
    if (!mount) return;

    const active = mount.getAttribute('data-active') || '';

    const isActive = (page) => active === page ? ' active' : '';

    // Bundle promo deadline. Fixed UTC instant so the same moment lands for every
    // visitor regardless of their clock's timezone, and so it cannot drift.
    //
    // What happens at zero: the bar stops rendering. The price does NOT change —
    // $55 simply becomes the standing price — so nothing here claims it will go
    // up. Saying "price rises Oct 1" would be the easy line to write and it
    // would be false.
    const SALE_ENDS = Date.parse('2026-09-30T23:59:59Z');
    // Audio Plugin Deals exclusive window: the $55 offer goes dark sitewide,
    // 2026-08-31 to 2026-09-13 (padded a day each side). Same dates as
    // components/apd-window.js and the drip functions; scripts/check-tracking.js
    // fails the build if they drift. Preview with ?apd_preview=1.
    const APD_START = Date.parse('2026-08-30T00:00:00Z');
    const APD_END = Date.parse('2026-09-14T23:59:59Z');
    const apdWindow = /[?&]apd_preview=1/.test(window.location.search)
        || (Date.now() >= APD_START && Date.now() <= APD_END);
    const saleLive = Date.now() < SALE_ENDS && !apdWindow;

    // Rendered server-agnostic: the countdown text is filled in by tick() below
    // so there is no flash of a wrong value before the first interval fires.
    const saleBar = saleLive
        ? `<a class="site-sale-bar" href="/bundle" aria-label="All 7 Plugins Bundle for $55 — offer ends 30 September 2026">
                <span>All Plugins Bundle</span>
                <strong>All 7 plugins — $55</strong>
                <em id="saleCountdown" aria-hidden="true"></em>
           </a>`
        : '';

    // Add-ons menu. Headings are static so the menu works even if the catalog
    // script fails; the item rows are filled from components/addons-catalog.js
    // (the same file the pages, the webhook and the build check read), so an
    // item's name, price and status can only ever be edited in one place.
    const ADDONS_CATALOG_SRC = '/components/addons-catalog.js?v=20260911-addons';
    const addonsActive = ['addons', 'expansion-packs', 'templates', 'mega-bundle'].indexOf(active) !== -1;
    const addonsMenu = `
                <div class="nav-dropdown nav-dropdown-addons">
                    <button class="nav-dropdown-trigger${addonsActive ? ' active' : ''}" type="button" aria-expanded="false" aria-controls="addonsMegaMenu">Add-ons</button>
                    <div class="nav-dropdown-menu addons-menu" id="addonsMegaMenu" aria-label="Carbonated Audio add-ons">
                        <div class="addons-menu-col">
                            <a class="addons-menu-head" href="/addons/expansion-packs"><span class="addons-menu-title">Expansion Packs</span><span class="addons-menu-sub">Preset packs for each plugin</span></a>
                            <div class="addons-menu-list" data-addons-list="expansion-packs"></div>
                        </div>
                        <div class="addons-menu-col">
                            <a class="addons-menu-head" href="/addons/templates"><span class="addons-menu-title">Pro Tools Templates</span><span class="addons-menu-sub">Sessions with the chains already built</span></a>
                            <div class="addons-menu-list" data-addons-list="templates"></div>
                        </div>
                        <a class="addons-menu-mega" href="/mega-bundle">
                            <span class="addons-menu-title">Mega Bundle</span>
                            <span class="addons-menu-sub">All 7 plugins, every expansion pack, every template.</span>
                            <span class="addons-menu-price">$160</span>
                            <span class="addons-menu-note" data-addons-mega-note>Coming soon</span>
                        </a>
                    </div>
                </div>`;

    mount.innerHTML = `
        ${saleBar}
        <nav>
            <a href="/" class="nav-logo">
                <img src="/logo.png" alt="Carbonated Audio" class="nav-logo-img">
            </a>
            <div class="nav-links">
                <div class="nav-dropdown">
                    <button class="nav-dropdown-trigger${active === 'carbonator' || active === 'desipper' || active === 'ontap' || active === 'pour' || active === 'fizzfuel' || active === 'still' || active === 'tallboy' ? ' active' : ''}" type="button" aria-expanded="false" aria-controls="productMegaMenu">Products</button>
                    <div class="nav-dropdown-menu" id="productMegaMenu" aria-label="Carbonated Audio products">
                        <a class="product-mega-card product-carbonator" href="/carbonator"><span class="product-mega-copy"><span class="dropdown-label">Carbonator</span><span class="dropdown-desc">One-knob analog saturation</span><span class="product-mega-price">$20 · Own it forever</span></span><img src="/carbonator-screenshot.webp" alt="Carbonator plugin interface" loading="lazy"></a>
                        <a class="product-mega-card product-desipper" href="/desipper"><span class="product-mega-copy"><span class="dropdown-label">De-Sipper</span><span class="dropdown-desc">Tame harsh S sounds, keep the shine</span><span class="product-mega-price">$20 · Free demo</span></span><img src="/desipper-screenshot.webp" alt="De-Sipper plugin interface" loading="lazy"></a>
                        <a class="product-mega-card product-ontap" href="/ontap"><span class="product-mega-copy"><span class="dropdown-label">On Tap</span><span class="dropdown-desc">Clean sidechain ducking</span><span class="product-mega-price">$20 · Free demo</span></span><img src="/ontap-screenshot.webp" alt="On Tap plugin interface" loading="lazy"></a>
                        <a class="product-mega-card product-pour" href="/pour"><span class="product-mega-copy"><span class="dropdown-label">Pour</span><span class="dropdown-desc">Width and movement for your mix</span><span class="product-mega-price">$20 · Free demo</span></span><img src="/pour-screenshot.webp" alt="Pour plugin interface" loading="lazy"></a>
                        <a class="product-mega-card product-tallboy" href="/tallboy"><span class="product-mega-copy"><span class="dropdown-label">TALLBOY</span><span class="dropdown-desc">Your track, played back on a handheld.</span><span class="product-mega-price">$20 &middot; Own it forever</span></span><img src="/tallboy-screenshot.webp" alt="TALLBOY plugin interface" loading="lazy"></a><a class="product-mega-card product-fizzfuel" href="/fizzfuel"><span class="product-mega-copy"><span class="dropdown-label">FIZZFUEL</span><span class="dropdown-desc">Five effects. One manual gearbox.</span><span class="product-mega-price">$29 · Own it forever</span></span><img src="/fizzfuel-screenshot.png" alt="FIZZFUEL plugin interface" loading="lazy"></a>
                        <a class="product-mega-card product-still" href="/still"><span class="product-mega-copy"><span class="dropdown-label">Still <span class="product-mega-free">FREE</span></span><span class="dropdown-desc">Remove noise. Keep the performance.</span><span class="product-mega-price">Free download</span></span><img src="/still-screenshot.png" alt="Still plugin interface" loading="lazy"></a>
                    </div>
                </div>${addonsMenu}
                <a href="/manual"${isActive('manual') ? ' class="active"' : ''}>Manual</a>
                <a href="/about"${isActive('about') ? ' class="active"' : ''}>About</a>
                <a href="/faq"${isActive('faq') ? ' class="active"' : ''}>FAQ</a>
                <a href="/press"${isActive('press') ? ' class="active"' : ''}>Press</a>
            </div>
            <button class="hamburger" id="hamburgerBtn" aria-label="Open menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </nav>

        <div class="mobile-menu" id="mobileMenu">
            <a href="/carbonator">Carbonator</a>
            <a href="/desipper">De-Sipper</a>
            <a href="/ontap">On Tap</a>
            <a href="/pour">Pour</a>
            <a href="/tallboy">TALLBOY</a>
            <a href="/fizzfuel">FIZZFUEL</a>
            <a href="/still">Still (Free)</a>
            <a href="/addons" class="mobile-menu-group">Add-ons</a>
            <a href="/addons/expansion-packs" class="mobile-menu-sub">Expansion Packs</a>
            <a href="/addons/templates" class="mobile-menu-sub">Pro Tools Templates</a>
            <a href="/mega-bundle" class="mobile-menu-sub">Mega Bundle</a>
            <a href="/manual">Manual</a>
            <a href="/about">About</a>
            <a href="/faq">FAQ</a>
            <a href="/press">Press</a>
        </div>
    `;

    // Hamburger toggle
    const hamburger = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });
    }

    // Two dropdowns now (Products, Add-ons). Opening one closes the other so
    // their fixed-position panels never stack on top of each other.
    const dropdowns = Array.prototype.slice.call(mount.querySelectorAll('.nav-dropdown'));
    const closeDropdown = (dd) => {
        dd.classList.remove('open');
        const t = dd.querySelector('.nav-dropdown-trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
    };
    dropdowns.forEach((dropdown) => {
        const dropdownTrigger = dropdown.querySelector('.nav-dropdown-trigger');
        const dropdownMenu = dropdown.querySelector('.nav-dropdown-menu');
        if (!dropdownTrigger || !dropdownMenu) return;
        dropdownTrigger.addEventListener('click', () => {
            const wasOpen = dropdown.classList.contains('open');
            dropdowns.forEach(closeDropdown);
            if (!wasOpen) {
                dropdown.classList.add('open');
                dropdownTrigger.setAttribute('aria-expanded', 'true');
            }
        });
        dropdownMenu.addEventListener('click', (event) => {
            if (event.target.closest('a')) closeDropdown(dropdown);
        });
    });
    document.addEventListener('click', (event) => {
        dropdowns.forEach((dd) => { if (!dd.contains(event.target)) closeDropdown(dd); });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') dropdowns.forEach(closeDropdown);
    });

    // --- add-ons menu: styles + items from the catalog ----------------------
    // Styles live here rather than in shared.css because the manual pages load
    // nav.js without shared.css; injecting keeps the menu identical everywhere.
    if (!document.getElementById('ca-addons-menu-css')) {
        const css = document.createElement('style');
        css.id = 'ca-addons-menu-css';
        css.textContent = [
            '.nav-dropdown-menu.addons-menu{grid-template-columns:1fr 1fr minmax(0,.85fr);gap:12px;padding:14px}',
            '.addons-menu-col{display:flex;flex-direction:column;gap:6px;min-width:0}',
            '.addons-menu a{text-decoration:none}',
            '.addons-menu-head{display:flex;flex-direction:column;gap:4px;padding:12px 12px 10px;border-radius:10px;color:#fff!important;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);transition:border-color .2s ease,background .2s ease}',
            '.addons-menu-head:hover,.addons-menu-head:focus-visible{border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.06)}',
            '.addons-menu-title{font-size:17px;font-weight:850;letter-spacing:-.03em;line-height:1.1;color:#fff}',
            '.addons-menu-sub{font-size:12.5px;line-height:1.35;color:#b9b3c9}',
            '.addons-menu-list{display:flex;flex-direction:column}',
            '.addons-menu-item{display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:8px;color:#d2cede!important;font-size:13.5px;transition:background .2s ease,color .2s ease}',
            '.addons-menu-item:hover,.addons-menu-item:focus-visible{background:rgba(255,255,255,.06);color:#fff!important}',
            '.addons-menu-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dot,#fff)}',
            '.addons-menu-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
            '.addons-menu-tag{flex:none;font-size:10.5px;font-weight:700;color:#8d86a3}',
            '.addons-menu-tag.is-live{color:#fff}',
            '.addons-menu-mega{position:relative;display:flex;flex-direction:column;gap:8px;padding:18px;border-radius:12px;color:#fff!important;border:1px solid rgba(255,107,43,.55);background:radial-gradient(circle at 100% 0%,rgba(204,51,255,.28),transparent 60%),radial-gradient(circle at 0% 100%,rgba(255,107,43,.26),transparent 60%),rgba(255,255,255,.03);transition:border-color .2s ease}',
            '.addons-menu-mega:hover,.addons-menu-mega:focus-visible{border-color:#ff8c42}',
            '.addons-menu-mega .addons-menu-title{font-size:22px}',
            '.addons-menu-price{margin-top:auto;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:28px;font-weight:500;letter-spacing:-.02em}',
            '.addons-menu-note{font-size:12px;color:#b9b3c9}',
            '.mobile-menu{overflow-y:auto;justify-content:safe center}',
            '.mobile-menu a.mobile-menu-sub{font-size:16px;padding:8px 24px;opacity:.85}'
        ].join('\n');
        document.head.appendChild(css);
    }

    const escHtml = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fillAddons = (cat) => {
        if (!cat || !cat.items) return;
        mount.querySelectorAll('[data-addons-list]').forEach((list) => {
            const cid = list.getAttribute('data-addons-list');
            const base = (cat.categories.filter((c) => c.id === cid)[0] || {}).path || '/addons';
            list.innerHTML = cat.inCategory(cid).map((it) => {
                const live = it.status === 'live';
                return '<a class="addons-menu-item" href="' + base + '#' + escHtml(it.id) + '">'
                    + '<span class="addons-menu-dot" style="--dot:' + escHtml(it.accent) + '"></span>'
                    + '<span class="addons-menu-name">' + escHtml(it.name.replace(/ Expansion Pack$/, '')) + '</span>'
                    + '<span class="addons-menu-tag' + (live ? ' is-live' : '') + '">' + (live ? '$' + it.price : 'Soon') + '</span></a>';
            }).join('');
        });
        const note = mount.querySelector('[data-addons-mega-note]');
        if (note && cat.mega.status === 'live') note.textContent = 'Everything we make. $' + cat.megaValue() + ' if bought separately.';
    };
    if (window.CA_ADDONS) {
        fillAddons(window.CA_ADDONS);
    } else {
        const tag = document.createElement('script');
        tag.src = ADDONS_CATALOG_SRC;
        tag.async = true;
        tag.onload = () => fillAddons(window.CA_ADDONS);
        document.head.appendChild(tag);
    }

    // --- bundle countdown ---------------------------------------------------
    // aria-hidden on the element and a full deadline in the link's aria-label,
    // because a value that rewrites itself every second is noise to a screen
    // reader — the date is the useful part, not the ticking.
    const countdown = document.getElementById('saleCountdown');
    if (countdown) {
        const pad = (n) => String(n).padStart(2, '0');
        // Declared before tick() so the expiry branch can clear it even if the
        // very first call already finds the deadline passed.
        let timer = null;

        const tick = () => {
            const left = SALE_ENDS - Date.now();

            if (left <= 0) {
                // Deadline passed while the page sat open. Remove the bar rather
                // than leave a dead "0d 00h" sitting there.
                const bar = countdown.closest('.site-sale-bar');
                if (bar) bar.remove();
                clearInterval(timer);
                return;
            }

            const days = Math.floor(left / 86400000);
            const hours = Math.floor(left / 3600000) % 24;
            const mins = Math.floor(left / 60000) % 60;
            const secs = Math.floor(left / 1000) % 60;

            // Drop to seconds only in the last day, where they actually mean
            // something; before that they are just visual noise.
            countdown.textContent = days > 0
                ? `Ends in ${days}d ${pad(hours)}h ${pad(mins)}m`
                : `Ends in ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
        };

        tick();
        if (SALE_ENDS - Date.now() > 0) timer = setInterval(tick, 1000);
    }

})();
