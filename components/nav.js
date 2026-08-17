// Carbonated Audio — Shared Navigation Component
// Usage: <div id="site-nav" data-active="home|carbonator|desipper"></div>
//        <script src="/components/nav.js"></script>

(function() {
    const mount = document.getElementById('site-nav');
    if (!mount) return;

    const active = mount.getAttribute('data-active') || '';

    const isActive = (page) => active === page ? ' active' : '';

    const septemberSaleActive = Date.now() < Date.parse('2026-10-01T03:59:59Z');
    const saleBar = septemberSaleActive
        ? `<a class="site-sale-bar" href="/bundle" aria-label="View the September Complete Bundle sale">
                <span>September Bundle Sale</span>
                <strong>All 6 plugins — $45</strong>
                <em>Normally $109 · Ends Sep 30</em>
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
                    <a class="nav-dropdown-trigger${active === 'carbonator' || active === 'desipper' || active === 'ontap' || active === 'pour' || active === 'fizzfuel' || active === 'still' ? ' active' : ''}">Products</a>
                    <div class="nav-dropdown-menu">
                        <a href="/carbonator"><div><div class="dropdown-label">Carbonator</div><div class="dropdown-desc">Analog saturation</div></div></a>
                        <a href="/desipper"><div><div class="dropdown-label">De-Sipper</div><div class="dropdown-desc">Transparent de-esser</div></div></a>
                        <a href="/ontap"><div><div class="dropdown-label">On Tap</div><div class="dropdown-desc">Sidechain ducking</div></div></a>
                        <a href="/pour"><div><div class="dropdown-label">Pour</div><div class="dropdown-desc">M/S stereo imager</div></div></a>
                        <a href="/fizzfuel"><div><div class="dropdown-label">FIZZFUEL</div><div class="dropdown-desc">6-effect gearbox</div></div></a>
                        <a href="/still"><div><div class="dropdown-label">Still <span class="product-mega-free">FREE</span></div><div class="dropdown-desc">Noise suppressor</div></div></a>
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

})();
