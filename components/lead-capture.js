// Carbonated Audio — Still free-plugin lead capture block
// Mounts on <div id="still-lead-capture"></div>.
// Loaded directly by standalone pages, or dynamically by footer.js on component pages.

(function () {
    var mount = document.getElementById('still-lead-capture');
    if (!mount) return;
    // /still has its own full gate — don't double-capture there
    if (window.location.pathname.indexOf('/still') === 0) return;

    var slug = window.location.pathname.replace(/\.html$/, '').replace(/[^a-z0-9-]/gi, '') || 'home';
    var source = 'still-footer-' + slug;

    mount.innerHTML = '' +
        '<section style="max-width:680px;margin:70px auto 20px;padding:32px 28px;text-align:center;' +
        'background:linear-gradient(135deg, rgba(46,143,133,0.14), rgba(111,199,188,0.06));' +
        'border:1px solid rgba(111,199,188,0.3);border-radius:16px;">' +
            '<span style="display:inline-block;background:#6fc7bc;color:#07201c;font-size:11px;font-weight:800;letter-spacing:.08em;padding:3px 10px;border-radius:20px;margin-bottom:10px;">100% FREE</span>' +
            '<h2 style="font-size:21px;color:#fff;margin:0 0 8px;font-weight:800;">Grab Still — our free noise suppressor</h2>' +
            '<p style="font-size:14px;color:#a09bb5;margin:0 0 18px;line-height:1.6;">One dial, background noise gone. Free forever, no catch &mdash; plus first dibs on new plugins and deals.<br>macOS today &middot; Windows on the way.</p>' +
            '<form id="stillCapForm" autocomplete="email" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">' +
                '<input type="email" id="stillCapEmail" placeholder="your@email.com" required aria-label="Email address" ' +
                    'style="flex:1;min-width:220px;max-width:320px;padding:13px 16px;border-radius:10px;border:1px solid rgba(111,199,188,0.4);background:rgba(13,10,26,0.7);color:#fff;font-size:15px;outline:none;">' +
                '<input type="text" id="stillCapHp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-5000px;opacity:0;height:0;width:0;">' +
                '<button type="submit" id="stillCapBtn" style="padding:13px 24px;border-radius:10px;border:none;cursor:pointer;background:linear-gradient(135deg,#2e8f85,#6fc7bc);color:#07201c;font-weight:700;font-size:15px;">Get Still Free</button>' +
            '</form>' +
            '<div id="stillCapSuccess" style="display:none;margin-top:6px;padding:14px;border-radius:10px;background:rgba(111,199,188,0.1);border:1px solid #2e8f85;color:#6fc7bc;font-size:14px;">' +
                '&#128167; Check your inbox &mdash; your download link is on the way.' +
            '</div>' +
            '<p id="stillCapNote" style="font-size:11px;color:#6b6580;margin:12px 0 0;">No spam. Unsubscribe anytime.</p>' +
        '</section>';

    document.getElementById('stillCapForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var contact = document.getElementById('stillCapEmail').value.trim();
        if (!contact) return;
        var btn = document.getElementById('stillCapBtn');
        btn.textContent = 'Sending…';
        btn.disabled = true;

        fetch('/.netlify/functions/capture-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contact: contact,
                source: source,
                website: document.getElementById('stillCapHp').value
            })
        }).then(function (res) {
            if (!res.ok) throw new Error('capture failed');
            return res.json();
        }).then(function (data) {
            if (data && data.success === false) throw new Error('capture failed');
            if (typeof gtag === 'function') gtag('event', 'free_download', { event_category: 'conversion', event_label: source });
            if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: 'Still Free Download', content_category: source });
            document.getElementById('stillCapForm').style.display = 'none';
            document.getElementById('stillCapSuccess').style.display = 'block';
        }).catch(function () {
            btn.textContent = 'Get Still Free';
            btn.disabled = false;
            var note = document.getElementById('stillCapNote');
            if (note) note.innerHTML = '<span style="color:#ffb4a2;">That didn’t go through &mdash; try again, or email mixedbysoda@gmail.com and we’ll send it directly.</span>';
        });
    });
})();
