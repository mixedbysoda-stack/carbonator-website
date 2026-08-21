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

})();
