// Carbonated Audio - Add-ons catalog (expansion packs, Pro Tools templates,
// and the Mega Bundle). ONE source of truth, read by:
//   - the browser: /addons, /addons/expansion-packs, /addons/templates,
//     /mega-bundle via components/addons.js (window.CA_ADDONS)
//   - Netlify functions: config.js builds PRODUCTS entries from it, so the
//     webhook, verify-session and download-addon agree with the pages
//   - scripts/check-tracking.js: fails the build if a live item has no mapped
//     payment link, or if the Mega Bundle value math drifts
//
// HOW AN ITEM GOES LIVE (do all four, in order):
//   1. Upload its zip to the private release below (repo + tag + `file`).
//   2. Activate its Stripe payment link (created INACTIVE on 2026-09-11; the
//      link is already in `paymentLink` and already mapped in
//      components/checkout-tracking.js).
//   3. Confirm ADDONS_GITHUB_TOKEN is set in Netlify and test one download.
//   4. Flip `status` to "live" and bump ?v= on every addons-catalog.js include.
// An item that is "live" without a file or a link fails check-tracking.
//
// Prices were set by SODA on 2026-09-11: packs $50, templates $70, Mega $160.
(function (root) {
  var CATALOG = {
    // Private GitHub repo holding the deliverable zips as release assets. The
    // download-addon function fetches them with ADDONS_GITHUB_TOKEN, so the
    // files are never publicly reachable.
    release: { repo: 'mixedbysoda-stack/carbonated-addons', tag: 'addons-v1' },

    categories: [
      {
        id: 'expansion-packs',
        name: 'Expansion Packs',
        path: '/addons/expansion-packs',
        tagline: 'New sounds for the plugins you already own.',
        blurb: 'Preset packs built for one plugin each. Load a starting point made for the job, tweak it, keep moving.'
      },
      {
        id: 'templates',
        name: 'Pro Tools Templates',
        path: '/addons/templates',
        tagline: 'Open a session that is already set up.',
        blurb: 'Routing, busses, sends, color-coding, and the Carbonated plugins already in the chain. Open it and record.'
      }
    ],

    items: [
      // ---- Expansion packs ($50) -------------------------------------------
      { id: 'pack_carbonator', category: 'expansion-packs', plugin: 'carbonator', pluginName: 'Carbonator',
        name: 'Carbonator Expansion Pack', price: 50, status: 'coming_soon', paymentLink: 'https://buy.stripe.com/7sY8wP9MRgVA4fneLx3oA0q',
        file: 'Carbonator-Expansion-Pack.zip', accent: '#f59e0b', image: '/carbonator-screenshot.webp',
        short: 'Saturation settings for vocals, 808s, drums, and the mix bus.',
        blurb: 'Flavor and drive settings dialed for vocals, 808s, drums, and the mix bus. Pull one up, ride the knob, move on.' },
      { id: 'pack_desipper', category: 'expansion-packs', plugin: 'desipper', pluginName: 'De-Sipper',
        name: 'De-Sipper Expansion Pack', price: 50, status: 'coming_soon', paymentLink: 'https://buy.stripe.com/6oU4gz7EJ0WCcLT1YL3oA0r',
        file: 'De-Sipper-Expansion-Pack.zip', accent: '#22d3ee', image: '/desipper-screenshot.webp',
        short: 'De-essing starting points for different voices and mics.',
        blurb: 'Starting points for different voices and mics: bright pop toplines, dark rap vocals, stacked harmonies, and spoken word.' },
      { id: 'pack_ontap', category: 'expansion-packs', plugin: 'ontap', pluginName: 'On Tap',
        name: 'On Tap Expansion Pack', price: 50, status: 'coming_soon', paymentLink: 'https://buy.stripe.com/eVqdR9f7bcFkdPXgTF3oA0s',
        file: 'On-Tap-Expansion-Pack.zip', accent: '#60a5fa', image: '/ontap-screenshot.webp',
        short: 'Ducking shapes for kick and bass, pads, and vocals.',
        blurb: 'Ducking shapes for kick and bass, pumping pads, vocal-over-beat, and tempo-locked movement.' },
      { id: 'pack_pour', category: 'expansion-packs', plugin: 'pour', pluginName: 'Pour',
        name: 'Pour Expansion Pack', price: 50, status: 'coming_soon', paymentLink: 'https://buy.stripe.com/eVq6oH8IN34Kh2932P3oA0t',
        file: 'Pour-Expansion-Pack.zip', accent: '#a78bfa', image: '/pour-screenshot.webp',
        short: 'Width and motion settings for leads, pads, and busses.',
        blurb: 'Width and motion settings for leads, pads, backing vocals, and stereo busses.' },
      { id: 'pack_fizzfuel', category: 'expansion-packs', plugin: 'octane', pluginName: 'FIZZFUEL',
        name: 'FIZZFUEL Expansion Pack', price: 50, status: 'coming_soon', paymentLink: 'https://buy.stripe.com/6oU28rf7b6gWaDL46T3oA0u',
        file: 'FIZZFUEL-Expansion-Pack.zip', accent: '#e879f9', image: '/fizzfuel-screenshot.png',
        short: 'Gear-by-gear setups for risers, transitions, and movement.',
        blurb: 'Gear-by-gear setups for risers, transitions, and any part that needs to move.' },
      { id: 'pack_tallboy', category: 'expansion-packs', plugin: 'tallboy', pluginName: 'TALLBOY',
        name: 'TALLBOY Expansion Pack', price: 50, status: 'coming_soon', paymentLink: 'https://buy.stripe.com/14A7sLe379t827fcDp3oA0v',
        file: 'TALLBOY-Expansion-Pack.zip', accent: '#c2d24f', image: '/tallboy-screenshot.webp',
        short: 'Chip voices and crush settings for leads, bass, and drums.',
        blurb: 'Chip voices and crush settings for leads, bass, vocals, and handheld-era drums.' },

      // ---- Pro Tools templates ($70) ---------------------------------------
      { id: 'tpl_vocal_chain', category: 'templates', name: 'Vocal Chain Template', price: 70,
        status: 'coming_soon', paymentLink: 'https://buy.stripe.com/fZudR95wBbBgcLTdHt3oA0w', file: 'Vocal-Chain-Template.zip', accent: '#22d3ee',
        uses: ['De-Sipper', 'Carbonator', 'Still'],
        short: 'Lead, doubles, ad-libs, and harmonies, routed and ready.',
        blurb: 'Lead, doubles, ad-libs, and harmony tracks routed to vocal busses, with De-Sipper and Carbonator already in the chain. Open it and record.' },
      { id: 'tpl_mix_bus', category: 'templates', name: 'Mix Bus Template', price: 70,
        status: 'coming_soon', paymentLink: 'https://buy.stripe.com/5kQcN5gbfgVA27fbzl3oA0x', file: 'Mix-Bus-Template.zip', accent: '#a78bfa',
        uses: ['On Tap', 'Pour', 'Carbonator'],
        short: 'Drum, music, and vocal busses feeding a finished mix bus.',
        blurb: 'Drum, music, and vocal busses feeding a mix bus with On Tap, Pour, and Carbonator in place. Drop your stems in and start balancing.' },
      { id: 'tpl_beat_session', category: 'templates', name: 'Beat Production Session', price: 70,
        status: 'coming_soon', paymentLink: 'https://buy.stripe.com/5kQbJ1e3748ObHPeLx3oA0y', file: 'Beat-Production-Session.zip', accent: '#f59e0b',
        uses: ['Carbonator', 'On Tap', 'Pour', 'FIZZFUEL', 'TALLBOY'],
        short: 'Drums, 808, melody, and FX tracks with the returns set up.',
        blurb: 'Drum, 808, melody, and FX tracks with sends, color-coding, and FIZZFUEL and TALLBOY ready on the creative returns.' },
      { id: 'tpl_mastering', category: 'templates', name: 'Mastering Session', price: 70,
        status: 'coming_soon', paymentLink: 'https://buy.stripe.com/4gM5kD5wBaxc3bj9rd3oA0z', file: 'Mastering-Session.zip', accent: '#ff6b2b',
        uses: ['Carbonator', 'Pour'],
        short: 'A stereo mastering chain with reference routing built in.',
        blurb: 'A stereo mastering chain built on Carbonator and Pour, with reference-track routing already set up so you can A/B as you go.' }
    ],

    // Everything: all 7 plugins plus every add-on above.
    mega: {
      id: 'mega_bundle',
      name: 'Mega Bundle',
      price: 160,
      status: 'coming_soon',
      paymentLink: 'https://buy.stripe.com/dRm8wP2kp9t8aDLgTF3oA0p',
      plugins: ['carbonator', 'desipper', 'ontap', 'pour', 'octane', 'tallboy', 'still'],
      // What the 7 plugins cost bought one at a time (5 x $20 + $29, Still free).
      pluginsValue: 129
    }
  };

  CATALOG.byId = function (id) {
    for (var i = 0; i < CATALOG.items.length; i++) if (CATALOG.items[i].id === id) return CATALOG.items[i];
    return id === CATALOG.mega.id ? CATALOG.mega : null;
  };
  CATALOG.inCategory = function (cat) {
    return CATALOG.items.filter(function (it) { return it.category === cat; });
  };
  CATALOG.megaValue = function () {
    return CATALOG.items.reduce(function (sum, it) { return sum + it.price; }, CATALOG.mega.pluginsValue);
  };

  if (typeof module === 'object' && module.exports) module.exports = CATALOG;
  else root.CA_ADDONS = CATALOG;
})(typeof window !== 'undefined' ? window : this);
