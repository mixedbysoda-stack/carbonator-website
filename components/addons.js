// Carbonated Audio - add-ons page behaviour.
// Needs components/addons-catalog.js loaded first (window.CA_ADDONS).
//
// Every CTA on the add-ons pages is a <div data-addon-cta="<catalog id>">
// containing a notify-me form in the static HTML. If the catalog marks that
// item live with a payment link, the form is swapped for a buy button, so an
// item goes on sale by editing the catalog only. Checkout attribution comes
// from checkout-tracking.js, which listens for clicks on any buy.stripe.com
// link, including ones added here.
(function () {
    var cat = window.CA_ADDONS;
    if (!cat) return;
    var page = (document.body.getAttribute('data-addons-page') || 'addons');

    function track(name, params) {
        try { if (typeof gtag === 'function') gtag('event', name, params); } catch (_) {}
    }
    function pixel(name, params) {
        try { if (typeof fbq === 'function') fbq('track', name, params); } catch (_) {}
    }

    // Buy buttons for anything that is live.
    document.querySelectorAll('[data-addon-cta]').forEach(function (slot) {
        var item = cat.byId(slot.getAttribute('data-addon-cta'));
        if (!item || item.status !== 'live' || !item.paymentLink) return;
        if (slot.querySelector('a.ad-buy')) return; // already rendered statically
        var a = document.createElement('a');
        a.className = 'ad-buy';
        a.href = item.paymentLink;
        a.setAttribute('data-checkout-placement', 'addons_' + page + '_' + item.id);
        a.textContent = 'Buy - $' + item.price;
        a.addEventListener('click', function () {
            pixel('InitiateCheckout', { value: item.price, currency: 'USD', content_name: item.name });
        });
        slot.innerHTML = '';
        slot.appendChild(a);
    });

    // Mega Bundle launch sale: the page carries both CTAs; show one.
    // Static default is the regular price, so a visitor without JS never sees
    // a sale price the Stripe link might not honour.
    var sale = cat.megaSale();
    document.querySelectorAll('[data-mega-sale]').forEach(function (el) { el.hidden = !sale; });
    document.querySelectorAll('[data-mega-regular]').forEach(function (el) { el.hidden = !!sale; });
    if (sale) {
        var pad = function (n) { return String(n).padStart(2, '0'); };
        var tick = function () {
            var left = Date.parse(sale.ends) - Date.now();
            if (left <= 0) { window.location.reload(); return; }
            var d = Math.floor(left / 86400000), h = Math.floor(left / 3600000) % 24, m = Math.floor(left / 60000) % 60;
            document.querySelectorAll('[data-mega-sale-countdown]').forEach(function (el) {
                el.textContent = d > 0 ? d + 'd ' + pad(h) + 'h ' + pad(m) + 'm left' : pad(h) + 'h ' + pad(m) + 'm left';
            });
        };
        tick(); setInterval(tick, 30000);
    }

    // Live prices wherever the page asks for them (static text is the fallback).
    document.querySelectorAll('[data-price-of]').forEach(function (el) {
        var item = cat.byId(el.getAttribute('data-price-of'));
        if (item) el.textContent = '$' + item.price;
    });
    document.querySelectorAll('[data-mega-value]').forEach(function (el) { el.textContent = '$' + cat.megaValue().toLocaleString('en-US'); });
    document.querySelectorAll('[data-mega-save]').forEach(function (el) { el.textContent = '$' + (cat.megaValue() - (sale ? sale.price : cat.mega.price)); });

    // Notify-me forms.
    document.querySelectorAll('form.ad-notify').forEach(function (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var input = form.querySelector('input[type="email"]');
            var hp = form.querySelector('.ad-hp');
            var btn = form.querySelector('button');
            var msg = form.querySelector('.ad-notify-msg');
            var itemId = form.getAttribute('data-item');
            var email = (input.value || '').trim();
            msg.classList.remove('is-error');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                msg.textContent = 'Enter a valid email address.';
                msg.classList.add('is-error');
                input.focus();
                return;
            }
            btn.disabled = true;
            btn.textContent = 'Saving...';
            fetch('/.netlify/functions/addon-waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, item: itemId, website: hp ? hp.value : '' })
            }).then(function (res) {
                return res.json().then(function (data) { return { ok: res.ok, data: data }; });
            }).then(function (r) {
                if (!r.ok || !r.data.success) throw new Error((r.data && r.data.error) || 'Could not save that.');
                form.classList.add('is-done');
                msg.textContent = r.data.already
                    ? 'You are already on the list. We will email you the day it drops.'
                    : 'You are on the list. One email the day it drops, nothing else.';
                track('generate_lead', { method: 'addon_waitlist', item_id: itemId });
                pixel('Lead', { content_name: itemId });
            }).catch(function (err) {
                msg.textContent = err.message + ' Please try again.';
                msg.classList.add('is-error');
                btn.disabled = false;
                btn.textContent = 'Notify me';
            });
        });
    });
})();
