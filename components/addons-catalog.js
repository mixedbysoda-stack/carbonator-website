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
//   1. Upload its zip (named exactly `file`) to the site's private blob store:
//      node scripts/upload-addons.js <folder with the zips>
//   2. Activate its Stripe payment link (the link is already in `paymentLink`
//      and mapped in components/checkout-tracking.js).
//   3. Flip `status` to "live", bump ?v= on every addons-catalog.js include,
//      run node scripts/check-tracking.js, push.
//   4. Buy it once and confirm the download button in the receipt works.
// An item that is "live" without a file name or a link fails check-tracking.
// The six expansion packs went live 2026-09-12; the four templates are next.
//
// Prices set by SODA 2026-09-11: packs $80, templates $98, Mega Bundle $500
// (bought separately: $129 + $480 + $392 = $1001).
(function (root) {
  var CATALOG = {
    // Deliverable zips live in the Netlify blob store "addon-files" (see
    // upload-addon-file.js). This GitHub release is only a fallback path that
    // download-addon.js tries when ADDONS_GITHUB_TOKEN is set.
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
        name: 'Carbonator Expansion Pack', price: 80, status: 'live', paymentLink: 'https://buy.stripe.com/4gM00j2kpeNs6nv8n93oA0B',
        file: 'Carbonator-Expansion-Pack.zip', accent: '#f59e0b', image: '/carbonator-screenshot.webp',
        short: 'Saturation settings for vocals, 808s, drums, and the mix bus.',
        blurb: 'Flavor and drive settings dialed for vocals, 808s, drums, and the mix bus. Pull one up, ride the knob, move on.' },
      { id: 'pack_desipper', category: 'expansion-packs', plugin: 'desipper', pluginName: 'De-Sipper',
        name: 'De-Sipper Expansion Pack', price: 80, status: 'live', paymentLink: 'https://buy.stripe.com/5kQ4gzgbfcFkbHP6f13oA0C',
        file: 'De-Sipper-Expansion-Pack.zip', accent: '#22d3ee', image: '/desipper-screenshot.webp',
        short: 'De-essing starting points for different voices and mics.',
        blurb: 'Starting points for different voices and mics: bright pop toplines, dark rap vocals, stacked harmonies, and spoken word.' },
      { id: 'pack_ontap', category: 'expansion-packs', plugin: 'ontap', pluginName: 'On Tap',
        name: 'On Tap Expansion Pack', price: 80, status: 'live', paymentLink: 'https://buy.stripe.com/14A6oHe377l05jr0UH3oA0D',
        file: 'On-Tap-Expansion-Pack.zip', accent: '#60a5fa', image: '/ontap-screenshot.webp',
        short: 'Ducking shapes for kick and bass, pads, and vocals.',
        blurb: 'Ducking shapes for kick and bass, pumping pads, vocal-over-beat, and tempo-locked movement.' },
      { id: 'pack_pour', category: 'expansion-packs', plugin: 'pour', pluginName: 'Pour',
        name: 'Pour Expansion Pack', price: 80, status: 'live', paymentLink: 'https://buy.stripe.com/00w5kD9MR7l0aDL6f13oA0E',
        file: 'Pour-Expansion-Pack.zip', accent: '#a78bfa', image: '/pour-screenshot.webp',
        short: 'Width and motion settings for leads, pads, and busses.',
        blurb: 'Width and motion settings for leads, pads, backing vocals, and stereo busses.' },
      { id: 'pack_fizzfuel', category: 'expansion-packs', plugin: 'octane', pluginName: 'FIZZFUEL',
        name: 'FIZZFUEL Expansion Pack', price: 80, status: 'live', paymentLink: 'https://buy.stripe.com/eVq8wP9MRcFk3bj1YL3oA0F',
        file: 'FIZZFUEL-Expansion-Pack.zip', accent: '#e879f9', image: '/fizzfuel-screenshot.png',
        short: 'Gear-by-gear setups for risers, transitions, and movement.',
        blurb: 'Gear-by-gear setups for risers, transitions, and any part that needs to move.' },
      { id: 'pack_tallboy', category: 'expansion-packs', plugin: 'tallboy', pluginName: 'TALLBOY',
        name: 'TALLBOY Expansion Pack', price: 80, status: 'live', paymentLink: 'https://buy.stripe.com/14A9ATaQVfRw8vDavh3oA0G',
        file: 'TALLBOY-Expansion-Pack.zip', accent: '#c2d24f', image: '/tallboy-screenshot.webp',
        short: 'Chip voices and crush settings for leads, bass, and drums.',
        blurb: 'Chip voices and crush settings for leads, bass, vocals, and handheld-era drums.' },

      // ---- Pro Tools templates ($70) ---------------------------------------
      { id: 'tpl_vocal_chain', category: 'templates', name: 'Vocal Chain Template', price: 98,
        status: 'coming_soon', paymentLink: 'https://buy.stripe.com/4gMaEX4sxbBgcLTfPB3oA0H', file: 'Vocal-Chain-Template.zip', accent: '#22d3ee',
        uses: ['De-Sipper', 'Carbonator', 'Still'],
        short: 'Lead, doubles, ad-libs, and harmonies, routed and ready.',
        blurb: 'Lead, doubles, ad-libs, and harmony tracks routed to vocal busses, with De-Sipper and Carbonator already in the chain. Open it and record.' },
      { id: 'tpl_mix_bus', category: 'templates', name: 'Mix Bus Template', price: 98,
        status: 'coming_soon', paymentLink: 'https://buy.stripe.com/dRm9ATe37axc6nvdHt3oA0I', file: 'Mix-Bus-Template.zip', accent: '#a78bfa',
        uses: ['On Tap', 'Pour', 'Carbonator'],
        short: 'Drum, music, and vocal busses feeding a finished mix bus.',
        blurb: 'Drum, music, and vocal busses feeding a mix bus with On Tap, Pour, and Carbonator in place. Drop your stems in and start balancing.' },
      { id: 'tpl_beat_session', category: 'templates', name: 'Beat Production Session', price: 98,
        status: 'coming_soon', paymentLink: 'https://buy.stripe.com/4gM8wP5wB9t84fncDp3oA0J', file: 'Beat-Production-Session.zip', accent: '#f59e0b',
        uses: ['Carbonator', 'On Tap', 'Pour', 'FIZZFUEL', 'TALLBOY'],
        short: 'Drums, 808, melody, and FX tracks with the returns set up.',
        blurb: 'Drum, 808, melody, and FX tracks with sends, color-coding, and FIZZFUEL and TALLBOY ready on the creative returns.' },
      { id: 'tpl_mastering', category: 'templates', name: 'Mastering Session', price: 98,
        status: 'coming_soon', paymentLink: 'https://buy.stripe.com/9B63cv9MR8p47rz46T3oA0K', file: 'Mastering-Session.zip', accent: '#ff6b2b',
        uses: ['Carbonator', 'Pour'],
        short: 'A stereo mastering chain with reference routing built in.',
        blurb: 'A stereo mastering chain built on Carbonator and Pour, with reference-track routing already set up so you can A/B as you go.' }
    ],

    // Everything: all 7 plugins plus every add-on above.
    mega: {
      id: 'mega_bundle',
      name: 'Mega Bundle',
      price: 500,
      // LIVE AS A PREORDER since 2026-09-11: buyers get the 7 plugins and
      // keys instantly; each add-on is emailed the day it is released. The
      // page, the checkout and the receipt all say so. check-tracking allows
      // a live Mega Bundle with unreleased items only while preorder is true.
      status: 'live',
      preorder: true,
      paymentLink: 'https://buy.stripe.com/5kQ3cv0chbBgbHPcDp3oA0A',
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
