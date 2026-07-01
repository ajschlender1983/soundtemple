/* SoundTemple — aliveness engine (shared). Zero dependencies.
   - confirms JS is alive (.js) so the hidden reveal-state can apply
   - phase-locks the CSS breath to a shared wall-clock epoch
   - scroll-driven blur-coalesce reveal (robust across any viewport; never leaves
     content stuck hidden — safety passes guarantee it) + re-scans fetched content
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
    // capped group-of-8 stagger on any not-yet-processed reveal
    var n = 0;
    Array.prototype.forEach.call((scope || doc).querySelectorAll('.reveal:not([data-st])'), function (el) {
      el.dataset.st = '1'; el.style.setProperty('--stagger', ((n++ % 8) * 60) + 'ms');
    });
  }

  if (REDUCED) {
    // organism at rest: present everything immediately, never animate
    collect(doc);
    Array.prototype.forEach.call(doc.querySelectorAll('.reveal'), function (el) { el.classList.add('is-in'); });
    return;
  }

  function VH() { return window.innerHeight || root.clientHeight || 800; } // never 0
  function revealPass() {
    var vh = VH();
    Array.prototype.forEach.call(doc.querySelectorAll('.reveal:not(.is-in)'), function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > -80) el.classList.add('is-in'); // in / just past view → coalesce
    });
  }

  var last = 0;
  function onScroll() { var t = Date.now(); if (t - last < 80) return; last = t; revealPass(); } // time-throttled (not rAF, which hidden tabs throttle)

  function scan(scope) { collect(scope); revealPass(); }
  window.aliveScan = scan;

  function ready() {
    scan(doc);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // dynamically added content (fetched grids, etc.)
    var t = null;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { scan(doc); }, 120); })
      .observe(doc.body, { childList: true, subtree: true });
    // safety passes — content in view must never stay hidden even if a scroll never happens
    setTimeout(revealPass, 350);
    setTimeout(revealPass, 1200);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', ready);
  else ready();
}());
