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
                </div>
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

    const dropdown = mount.querySelector('.nav-dropdown');
    const dropdownTrigger = mount.querySelector('.nav-dropdown-trigger');
    const dropdownMenu = mount.querySelector('.nav-dropdown-menu');
    if (dropdown && dropdownTrigger && dropdownMenu) {
        const closeDropdown = () => {
            dropdown.classList.remove('open');
            dropdownTrigger.setAttribute('aria-expanded', 'false');
        };
        const openDropdown = () => {
            dropdown.classList.add('open');
            dropdownTrigger.setAttribute('aria-expanded', 'true');
        };
        dropdownTrigger.addEventListener('click', () => dropdown.classList.contains('open') ? closeDropdown() : openDropdown());
        document.addEventListener('click', (event) => {
            if (!dropdown.contains(event.target)) closeDropdown();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeDropdown();
        });
        dropdownMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeDropdown));
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
