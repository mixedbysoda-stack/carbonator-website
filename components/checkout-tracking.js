// Tracks buy intent while keeping Stripe Payment Links as the checkout surface.
// The Stripe webhook later reports the confirmed payment to GA4.
//
// THIS SCRIPT MUST FAIL OPEN.
// Every buy.stripe.com link gets a client_reference_id appended, whether or not
// its payment link appears in the `products` map below. That reference is the
// only way netlify/functions/stripe-webhook.js can join a confirmed Stripe
// payment back to the originating GA4 visit -- without it, reportPurchase()
// silently returns { skipped: true } and the sale never reaches GA4.
//
// The map is enrichment only: it supplies item name and value for the
// begin_checkout event. A payment link that is missing from the map still gets
// its revenue tracked, and still fires begin_checkout tagged
// `unmapped:<linkId>` so the gap is visible in GA4 instead of costing you a
// month of attribution before anyone notices.
//
// This is what broke TALLBOY: link 9B68wP8INbBg3bjfPB3oA0i was never added to
// the map, productFor() returned null, the handler returned early, and four
// paid orders on 23-24 Aug 2026 never reached GA4.
(function () {
  if (window.__caCheckoutTracking) return;
  window.__caCheckoutTracking = true;
  var MEASUREMENT_ID = 'G-Z9L20HJ4M0';
  var products = {
    '6oUeVd7EJ6gW13b6f13oA0f': { id: 'octane', name: 'FIZZFUEL', price: 29 },
    'aFafZhgbffRw6nv0UH3oA00': { id: 'carbonator', name: 'Carbonator', price: 20 },
    '9B6bJ11gl7l0aDLgTF3oA0b': { id: 'desipper', name: 'De-Sipper', price: 20 },
    '5kQcN51gl6gWfY51YL3oA04': { id: 'ontap', name: 'On Tap', price: 20 },
    'bJe4gz0ch7l0aDL9rd3oA07': { id: 'pour', name: 'Pour', price: 20 },
    '9B68wP8INbBg3bjfPB3oA0i': { id: 'tallboy', name: 'TALLBOY', price: 20 },
    'dRmbJ16AFbBgcLT6f13oA0k': { id: 'september_bundle', name: 'Carbonated Audio All 7 Plugins Bundle', price: 55 },
    // Superseded 2026-08-23. Still mapped because bundle links in drip mail
    // already sent point here, discounted to $45 by ALL6FOR45 until Sep 30.
    '3cI7sL2kpaxcdPX1YL3oA0h': { id: 'september_bundle', name: 'Carbonated Audio All 7 Plugins Bundle', price: 45 },
    '7sY28raQV34KeU1bzl3oA09': { id: 'vocal_bundle', name: 'Vocal Chain Bundle', price: 35 },
    '28EeVdcZ3gVA27f1YL3oA0a': { id: 'mixbus_bundle', name: 'Mix Bus Bundle', price: 30 }
  };
  function linkIdFor(url) {
    var match = String(url).match(/buy\.stripe\.com\/(?:test\/)?([A-Za-z0-9]+)/);
    return match ? match[1] : null;
  }
  function productFor(url) {
    for (var id in products) if (url.indexOf(id) !== -1) return products[id];
    return null;
  }
  function reference(clientId) {
    if (!clientId) return null;
    try { return 'ca_' + btoa(clientId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    catch (_) { return null; }
  }
  // Fallback client id for pages where gtag.js has not loaded (or was blocked)
  // but the visitor already has a GA cookie from an earlier page. The _ga
  // cookie is `GA1.1.<clientId>` and clientId is itself dotted, so take
  // everything after the first two segments.
  function clientIdFromCookie() {
    var match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
    if (!match) return null;
    var parts = decodeURIComponent(match[1]).split('.');
    return parts.length >= 4 ? parts.slice(2).join('.') : null;
  }
  function campaignContext() {
    var params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || '',
      placement: ''
    };
  }
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href*="buy.stripe.com"]');
    if (!link || link.dataset.checkoutTracking === 'done') return;
    var linkId = linkIdFor(link.href) || 'unknown';
    var known = productFor(link.href);
    // Unmapped links are still tracked. Never bail out here.
    var product = known || { id: 'unmapped_' + linkId, name: 'unmapped:' + linkId, price: 0 };
    event.preventDefault();
    link.dataset.checkoutTracking = 'done';
    var navigated = false;
    var checkoutEventSent = false;
    var campaign = campaignContext();
    campaign.placement = link.dataset.checkoutPlacement || link.closest('section')?.id || 'site_link';

    function withReference(clientId) {
      var ref = reference(clientId);
      if (!ref) return link.href;
      try {
        var url = new URL(link.href);
        url.searchParams.set('client_reference_id', ref);
        return url.toString();
      } catch (_) { return link.href; }
    }

    // Start from the cookie-derived reference so the revenue join survives even
    // if gtag never answers. The gtag callback upgrades it when it does.
    var destination = withReference(clientIdFromCookie());

    function go(url) {
      if (navigated) return;
      navigated = true;
      window.location.assign(url);
    }
    function sendCheckoutEvent() {
      if (checkoutEventSent) return;
      checkoutEventSent = true;
      gtag('event', 'begin_checkout', {
        currency: 'USD',
        value: product.price,
        items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity: 1 }],
        checkout_placement: campaign.placement,
        checkout_link_id: linkId,
        checkout_link_mapped: known ? 'yes' : 'no',
        campaign_source: campaign.source,
        campaign_medium: campaign.medium,
        campaign_name: campaign.campaign,
        transport_type: 'beacon',
        event_callback: function () { go(destination); }
      });
    }

    if (typeof gtag === 'function') {
      // Send the event before navigating. The callback is best effort; checkout never waits
      // longer than 1.2 seconds when GA or an extension blocks analytics.
      window.setTimeout(sendCheckoutEvent, 300);
      window.setTimeout(function () { go(destination); }, 1200);
      gtag('get', MEASUREMENT_ID, 'client_id', function (clientId) {
        destination = withReference(clientId) || destination;
        sendCheckoutEvent();
      });
    } else {
      // No gtag on this page: begin_checkout is lost, but the purchase is not.
      go(destination);
    }
  });
})();
