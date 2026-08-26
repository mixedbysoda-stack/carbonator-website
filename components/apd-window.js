// Audio Plugin Deals exclusive window - 2026-08-31 through 2026-09-13.
//
// During the window, every discounted route to the bundle plugins goes dark and
// the All 7 bundle sells at its regular $129, because that is what we promised
// APD in writing on 2026-08-26: "your page is the only discounted way to buy
// any of it." Bounds are padded a day on each side on purpose - going dark
// early is cheap, overlapping their exclusive is not.
//
// Mechanics: elements marked data-apd-hide are REMOVED during the window
// (removal, not display:none, so no later script can un-hide them). Elements
// marked data-apd-show (authored with style="display:none") get their inline
// display cleared so the stylesheet takes over. Pages author $129 "twins" next
// to their $55 sale markup; outside the window this script does nothing at all.
//
// Preview before the window opens: append ?apd_preview=1 to any URL.
// These dates also appear in components/nav.js and the two drip functions -
// scripts/check-tracking.js fails the build if they ever drift apart.
(function () {
  var START = Date.parse('2026-08-30T00:00:00Z');
  var END = Date.parse('2026-09-14T23:59:59Z');
  var preview = /[?&]apd_preview=1/.test(window.location.search);
  var now = Date.now();
  var active = preview || (now >= START && now <= END);
  window.__caApdWindow = active;
  if (!active) return;
  document.documentElement.classList.add('apd-window');
  document.querySelectorAll('[data-apd-hide]').forEach(function (el) { el.remove(); });
  document.querySelectorAll('[data-apd-show]').forEach(function (el) { el.style.removeProperty('display'); });
})();
