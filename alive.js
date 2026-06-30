/* SoundTemple — aliveness engine (shared). Zero dependencies, < 2KB-ish.
   - confirms JS is alive (.js) so the hidden reveal-state can apply
   - phase-locks the CSS breath to a shared wall-clock epoch
   - auto-targets elements for blur-coalesce scroll-reveal (IntersectionObserver)
   - re-scans dynamically added content (e.g. the fetched artist grid)
   - full prefers-reduced-motion kill-switch */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  root.classList.add('js');

  // phase-lock the breath so every page (and the embedded map) crest together
  try { root.style.animationDelay = (-((Date.now() / 1000) % 13)) + 's'; } catch (e) {}

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // which elements come alive on scroll, and how
  var VARIANTS = [
    ['.hero h1, .hero .sub, .hero-c > *', 'focus'],
    ['.tier', 'left'],
    ['.st-artist-card', 'scale'],
    ['.h-sec, .lead, .eyebrow, .tool, .cert, .doc-item, .field-frame, .cert-grid > *, .tool-grid > *', '']
  ];

  function tag(el, variant) {
    if (el.classList.contains('reveal') || el.closest('.no-reveal')) return;
    el.classList.add('reveal');
    if (variant) el.setAttribute('data-reveal', variant);
  }
  function collect(scope) {
    VARIANTS.forEach(function (pair) {
      Array.prototype.forEach.call((scope || doc).querySelectorAll(pair[0]), function (el) { tag(el, pair[1]); });
    });
  }

  if (REDUCED) {
    // organism at rest: present everything immediately, never observe
    collect(doc);
    Array.prototype.forEach.call(doc.querySelectorAll('.reveal'), function (el) { el.classList.add('is-in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  var vh = function () { return window.innerHeight || doc.documentElement.clientHeight; };
  function observeNew() {
    var fresh = [];
    Array.prototype.forEach.call(doc.querySelectorAll('.reveal:not(.is-in)'), function (el) {
      if (el.dataset.obs) return; el.dataset.obs = '1'; fresh.push(el);
    });
    // read all positions first (no interleaved write → no layout thrash)
    var rects = fresh.map(function (el) { return el.getBoundingClientRect(); });
    var n = 0;
    fresh.forEach(function (el, i) {
      var r = rects[i];
      if (r.top < vh() * 0.95 && r.bottom > 0) {   // already on screen at load → present it, no flash, no journey
        el.classList.add('is-in');
      } else {
        el.style.setProperty('--stagger', ((n++ % 8) * 60) + 'ms'); // below the fold → blur-coalesce on scroll
        io.observe(el);
      }
    });
  }
  function scan(scope) { collect(scope); observeNew(); }
  window.aliveScan = scan;

  function ready() {
    scan(doc);
    // catch content added after first paint (fetched grids, etc.)
    var t = null;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { scan(doc); }, 120); })
      .observe(doc.body, { childList: true, subtree: true });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', ready);
  else ready();
}());
