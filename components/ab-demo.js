// Carbonated Audio — reusable A/B audio demo (v2)
// Usage: <div id="ab-demo" data-product="carbonator"></div>
//        <script src="/components/ab-demo.js"></script>
// One BYPASS/IN toggle crossfades dry vs wet (~30ms), position preserved.
// Products without clips render an email waitlist instead of a broken player.

(function () {
    var mount = document.getElementById('ab-demo');
    if (!mount) return;
    var product = (mount.getAttribute('data-product') || '').toLowerCase() || 'unknown';

    var CONFIG = {
        carbonator: {
            dry: '/audio/dry.mp3',
            variants: [
                { id: 'cherry', label: 'Cherry', src: '/audio/cherry-wet.mp3' },
                { id: 'cola', label: 'Cola', src: '/audio/cola-wet.mp3' },
                { id: 'grape', label: 'Grape', src: '/audio/grape-wet.mp3' },
                { id: 'lemon-lime', label: 'Lemon-Lime', src: '/audio/lemon-lime-wet.mp3' },
                { id: 'orange-cream', label: 'Orange Cream', src: '/audio/orange-cream-wet.mp3' }
            ]
        }
    };

    function track(name, label) {
        if (typeof gtag === 'function') {
            gtag('event', name, { event_category: 'engagement', event_label: label });
        }
    }

    var cfg = CONFIG[product];

    /* ---------- Waitlist fallback (no clips recorded yet) ---------- */
    if (!cfg) {
        mount.innerHTML = '' +
            '<div class="v2-ab-fallback">' +
                '<p class="v2-body" style="margin:0 auto;">Demo clips for this one are being recorded right now. ' +
                'Drop your email and you’ll hear it the moment they’re up — plus first dibs on launch deals.</p>' +
                '<form class="v2-ab-fallback-form" id="abWaitForm">' +
                    '<input type="email" class="v2-ab-input" id="abWaitEmail" placeholder="you@email.com" autocomplete="email" required aria-label="Email address">' +
                    '<input type="text" id="abWaitHp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-5000px;opacity:0;height:0;width:0;">' +
                    '<button type="submit" class="v2-btn" id="abWaitBtn">Notify me</button>' +
                '</form>' +
                '<div class="v2-ab-success" id="abWaitOk" style="display:none;">Done — you’ll be the first to hear it.</div>' +
                '<p class="v2-ab-note">No spam, ever. Unsubscribe anytime.</p>' +
            '</div>';
        document.getElementById('abWaitForm').addEventListener('submit', function (e) {
            e.preventDefault();
            var email = document.getElementById('abWaitEmail').value.trim();
            if (!email) return;
            var btn = document.getElementById('abWaitBtn');
            btn.textContent = 'Sending…';
            btn.disabled = true;
            fetch('/.netlify/functions/capture-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contact: email,
                    source: 'ab-demo-waitlist-' + product,
                    website: document.getElementById('abWaitHp').value
                })
            }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function () {
                document.getElementById('abWaitForm').style.display = 'none';
                document.getElementById('abWaitOk').style.display = 'block';
            }).catch(function () {
                btn.textContent = 'Notify me';
                btn.disabled = false;
            });
        });
        return;
    }

    /* ---------- Player markup ---------- */
    var bars = '';
    for (var i = 0; i < 64; i++) {
        var h = 8 + Math.round(40 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)));
        bars += '<rect x="' + (i * 10) + '" y="' + (56 - h) / 1 + '" width="6" height="' + h + '" rx="2"></rect>';
    }
    var chips = cfg.variants.map(function (v, idx) {
        return '<button type="button" class="v2-ab-chip' + (idx === 0 ? ' active' : '') + '" data-variant="' + v.id + '">' + v.label + '</button>';
    }).join('');

    mount.innerHTML = '' +
        '<div class="v2-ab-player" id="abPlayer" data-engaged="0">' +
            '<button type="button" class="v2-ab-play" id="abPlay" aria-label="Play demo">' +
                '<svg viewBox="0 0 24 24" id="abPlayIcon"><polygon points="7,4 21,12 7,20"></polygon></svg>' +
            '</button>' +
            '<svg class="v2-ab-wave" viewBox="0 0 640 56" preserveAspectRatio="none" aria-hidden="true">' + bars + '</svg>' +
            '<div><button type="button" class="v2-ab-toggle" id="abToggle" data-state="bypass" aria-label="Toggle plugin in or bypassed">' +
                '<span class="v2-ab-t-bypass">BYPASS</span><span class="v2-ab-t-in">IN</span>' +
            '</button></div>' +
            '<div class="v2-ab-chips" id="abChips">' + chips + '</div>' +
            '<p class="v2-ab-note" id="abNote">Same clip, level-matched. Tap play, then flip the switch.</p>' +
        '</div>';

    var playBtn = document.getElementById('abPlay');
    var playIcon = document.getElementById('abPlayIcon');
    var toggleBtn = document.getElementById('abToggle');
    var playerEl = document.getElementById('abPlayer');
    var chipsEl = document.getElementById('abChips');

    var FADE = 0.03;                    // ~30ms crossfade
    var current = cfg.variants[0];
    var engaged = false;                // false = bypass (dry), true = IN (wet)
    var playing = false;
    var loading = false;

    /* ---------- WebAudio engine (preferred) ---------- */
    var AC = window.AudioContext || window.webkitAudioContext;
    var ctx = null, dryBuf = null, wetBufs = {}, dryGain = null, wetGain = null;
    var srcDry = null, srcWet = null, startedAt = 0;

    function loadBuf(url) {
        return fetch(url).then(function (r) {
            if (!r.ok) throw new Error('fetch ' + url);
            return r.arrayBuffer();
        }).then(function (ab) {
            return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); });
        });
    }

    function startSources(offset) {
        if (srcDry) { try { srcDry.stop(); } catch (e) {} }
        if (srcWet) { try { srcWet.stop(); } catch (e) {} }
        srcDry = ctx.createBufferSource(); srcDry.buffer = dryBuf; srcDry.loop = true;
        srcWet = ctx.createBufferSource(); srcWet.buffer = wetBufs[current.id]; srcWet.loop = true;
        srcDry.connect(dryGain); srcWet.connect(wetGain);
        var t = ctx.currentTime;
        srcDry.start(t, offset % dryBuf.duration);
        srcWet.start(t, offset % wetBufs[current.id].duration);
        startedAt = t - offset;
    }

    function applyGains() {
        var t = ctx.currentTime;
        dryGain.gain.cancelScheduledValues(t);
        wetGain.gain.cancelScheduledValues(t);
        dryGain.gain.setValueAtTime(dryGain.gain.value, t);
        wetGain.gain.setValueAtTime(wetGain.gain.value, t);
        dryGain.gain.linearRampToValueAtTime(engaged ? 0 : 1, t + FADE);
        wetGain.gain.linearRampToValueAtTime(engaged ? 1 : 0, t + FADE);
    }

    /* ---------- HTMLAudio muted-swap fallback ---------- */
    var elDry = null, elWet = null;
    function fallbackStart() {
        elDry = new Audio(cfg.dry); elWet = new Audio(current.src);
        elDry.loop = elWet.loop = true;
        elDry.muted = engaged; elWet.muted = !engaged;
        elDry.play(); elWet.play();
    }

    function setUI() {
        toggleBtn.setAttribute('data-state', engaged ? 'in' : 'bypass');
        playerEl.setAttribute('data-engaged', engaged ? '1' : '0');
        playIcon.innerHTML = playing
            ? '<rect x="5" y="4" width="4.5" height="16" rx="1"></rect><rect x="14.5" y="4" width="4.5" height="16" rx="1"></rect>'
            : '<polygon points="7,4 21,12 7,20"></polygon>';
        playBtn.setAttribute('aria-label', playing ? 'Pause demo' : 'Play demo');
    }

    playBtn.addEventListener('click', function () {
        if (loading) return;
        if (playing) { // pause
            playing = false;
            if (ctx) { ctx.suspend(); }
            else if (elDry) { elDry.pause(); elWet.pause(); }
            setUI();
            return;
        }
        if (ctx || elDry) { // resume
            playing = true;
            if (ctx) { ctx.resume(); }
            else { elDry.play(); elWet.play(); }
            setUI();
            return;
        }
        // First tap: build engine, load nothing before this (iOS gesture rule)
        loading = true;
        document.getElementById('abNote').textContent = 'Loading clips…';
        track('ab_demo_play', product);
        if (AC) {
            ctx = new AC();
            dryGain = ctx.createGain(); wetGain = ctx.createGain();
            dryGain.gain.value = 1; wetGain.gain.value = 0;
            dryGain.connect(ctx.destination); wetGain.connect(ctx.destination);
            Promise.all([loadBuf(cfg.dry), loadBuf(current.src)]).then(function (bufs) {
                dryBuf = bufs[0]; wetBufs[current.id] = bufs[1];
                loading = false; playing = true;
                startSources(0); applyGains(); setUI();
                document.getElementById('abNote').textContent = 'Flip the switch. Same clip, level-matched.';
            }).catch(function () { ctx = null; loading = false; fallbackStart(); playing = true; setUI(); });
        } else {
            loading = false; fallbackStart(); playing = true; setUI();
        }
    });

    toggleBtn.addEventListener('click', function () {
        engaged = !engaged;
        if (ctx && dryBuf) applyGains();
        else if (elDry) { elDry.muted = engaged; elWet.muted = !engaged; }
        setUI();
        track('ab_demo_toggle', product + ':' + (engaged ? 'in' : 'bypass'));
    });

    chipsEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.v2-ab-chip');
        if (!btn) return;
        var id = btn.getAttribute('data-variant');
        var v = cfg.variants.filter(function (x) { return x.id === id; })[0];
        if (!v || v.id === current.id) return;
        chipsEl.querySelectorAll('.v2-ab-chip').forEach(function (c) { c.classList.remove('active'); });
        btn.classList.add('active');
        track('ab_demo_variant', product + ':' + id);
        var prev = current; current = v;
        if (ctx && dryBuf) {
            var swap = function () {
                var offset = playing ? (ctx.currentTime - startedAt) : 0;
                startSources(Math.max(0, offset));
                applyGains();
            };
            if (wetBufs[id]) swap();
            else loadBuf(v.src).then(function (b) { wetBufs[id] = b; swap(); }).catch(function () { current = prev; });
        } else if (elWet) {
            var t = elWet.currentTime, wasMuted = elWet.muted;
            var next = new Audio(v.src);
            next.loop = true; next.muted = wasMuted; next.currentTime = t;
            if (playing) next.play();
            elWet.pause(); elWet = next;
        }
    });
})();
