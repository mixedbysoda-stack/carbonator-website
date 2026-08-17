// Tracks buy intent while keeping Stripe Payment Links as the checkout surface.
// The Stripe webhook later reports the confirmed payment to GA4.
(function () {
  if (window.__caCheckoutTracking) return;
  window.__caCheckoutTracking = true;
  var products = {
    '6oUeVd7EJ6gW13b6f13oA0f': { id: 'octane', name: 'FIZZFUEL', price: 29 },
    'aFafZhgbffRw6nv0UH3oA00': { id: 'carbonator', name: 'Carbonator', price: 20 },
    '9B6bJ11gl7l0aDLgTF3oA0b': { id: 'desipper', name: 'De-Sipper', price: 20 },
    '5kQcN51gl6gWfY51YL3oA04': { id: 'ontap', name: 'On Tap', price: 20 },
    'bJe4gz0ch7l0aDL9rd3oA07': { id: 'pour', name: 'Pour', price: 20 },
    '3cI7sL2kpaxcdPX1YL3oA0h': { id: 'september_bundle', name: 'Carbonated Audio All 6 Plugins Bundle', price: 45 },
    '7sY28raQV34KeU1bzl3oA09': { id: 'vocal_bundle', name: 'Vocal Chain Bundle', price: 35 },
    '28EeVdcZ3gVA27f1YL3oA0a': { id: 'mixbus_bundle', name: 'Mix Bus Bundle', price: 30 }
  };
  function productFor(url) {
    for (var id in products) if (url.indexOf(id) !== -1) return products[id];
    return null;
  }
  function reference(clientId) {
    try { return 'ca_' + btoa(clientId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    catch (_) { return null; }
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
    var product = productFor(link.href);
    if (!product) return;
    event.preventDefault();
    link.dataset.checkoutTracking = 'done';
    var navigated = false;
    var campaign = campaignContext();
    campaign.placement = link.dataset.checkoutPlacement || link.closest('section')?.id || 'site_link';
    function go(destination) {
      if (navigated) return;
      navigated = true;
      window.location.assign(destination);
    }
    if (typeof gtag === 'function') {
      gtag('event', 'begin_checkout', {
        currency: 'USD',
        value: product.price,
        items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity: 1 }],
        checkout_placement: campaign.placement,
        campaign_source: campaign.source,
        campaign_medium: campaign.medium,
        campaign_name: campaign.campaign
      });
      // Analytics blockers can prevent the client-ID callback. Never block checkout for it.
      window.setTimeout(function () { go(link.href); }, 800);
      gtag('get', 'G-Z9L20HJ4M0', 'client_id', function (clientId) {
        var destination = new URL(link.href);
        var ref = reference(clientId);
        if (ref) destination.searchParams.set('client_reference_id', ref);
        go(destination.toString());
      });
    } else {
      go(link.href);
    }
  });
})();
