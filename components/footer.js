// Carbonated Audio — Shared Footer Component
// Usage: <div id="site-footer"></div>
//        <script src="/components/footer.js"></script>

(function() {
    const mount = document.getElementById('site-footer');
    if (!mount) return;

    const year = new Date().getFullYear();

    mount.innerHTML = `
        <footer class="site-footer">
            <div class="footer-left">
                <span class="footer-text">&copy; ${year} Carbonated Audio. All rights reserved.</span>
            </div>
            <div class="footer-links">
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
})();
