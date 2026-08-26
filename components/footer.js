// Carbonated Audio — Shared Footer Component
// Usage: <div id="site-footer"></div>
//        <script src="/components/footer.js"></script>

(function() {
    const mount = document.getElementById('site-footer');
    if (!mount) return;

    const year = new Date().getFullYear();

    mount.innerHTML = `
        <div id="still-lead-capture"></div>
        <footer class="site-footer">
            <div class="footer-left">
                <span class="footer-text">&copy; ${year} Carbonated Audio. All rights reserved.</span>
            </div>
            <div class="footer-links">
                <a href="/still" style="color:#6fc7bc;">Still <span style="font-size:9px;vertical-align:middle;background:#6fc7bc;color:#07201c;padding:1px 5px;border-radius:10px;font-weight:800;">FREE</span></a>
                <a href="/fizzfuel">FIZZFUEL</a>
                <a href="/carbonator">Carbonator</a>
                <a href="/desipper">De-Sipper</a>
                <a href="/ontap">On Tap</a>
                <a href="/pour">Pour</a>
                <a href="/about">About</a>
                <a href="/press">Press</a>
                <a href="mailto:mixedbysoda@gmail.com">Support</a>
            </div>
        </footer>
        <div class="footer-legal" style="text-align:center;padding:14px 20px 26px;font-size:11px;color:#6b6580;letter-spacing:0.02em;">
            <a href="/terms" style="color:#6b6580;text-decoration:none;margin:0 10px;">Terms</a>·
            <a href="/privacy" style="color:#6b6580;text-decoration:none;margin:0 10px;">Privacy</a>·
            <a href="/eula" style="color:#6b6580;text-decoration:none;margin:0 10px;">EULA</a>
        </div>
    `;

    // Load the Still lead-capture block (renders into the mount above; no-ops on /still)
    var s = document.createElement('script');
    s.src = '/components/lead-capture.js?v=20260711';
    document.body.appendChild(s);

    var checkout = document.createElement('script');
    checkout.src = '/components/checkout-tracking.js?v=20260826-tallboy-fix';
    document.body.appendChild(checkout);
})();
