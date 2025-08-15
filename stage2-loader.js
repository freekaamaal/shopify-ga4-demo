// stage2-loader.js
(function () {
  try {
    /* ===== CONFIG ===== */
    var BASE = 'https://freekaamaal.github.io/shopify-ga4-demo/'; // where your files live
    var REQUIRE_POC_PARAM = false;                                 // set true to require ?poc=1
    var VERSION = 'v=20250815a';                                   // bump when you update files

    /* ===== CONTEXT ===== */
    var host  = window.location.hostname;
    var path  = window.location.pathname || '';
    var query = window.location.search  || '';

    if (REQUIRE_POC_PARAM && !/[?&]poc=1\b/.test(query)) return;

    // Detect checkout + thank-you (handles "thank-you" and "thank_you")
    var isCheckout = /\/checkouts\//i.test(path);
    var isThankYou = /\/checkouts\/[^/]+\/thank(?:_|-)you/i.test(path) || /thank(?:_|-)you/i.test(path);

    // Pick file: thank-you → stage3.js; otherwise → demo-final.js
    var file = isThankYou ? 'stage3.js' : 'demo-final.js';

    // Build script URL (include domain + cache-busting)
    var src = BASE + file + '?domain=' + encodeURIComponent(host) + '&' + VERSION + '&t=' + Date.now();

    // Inject as early as possible (before first <script>)
    var s = document.createElement('script');
    s.async = true;
    s.src   = src;

    var first = document.getElementsByTagName('script')[0];
    if (first && first.parentNode) {
      first.parentNode.insertBefore(s, first);
    } else {
      (document.head || document.documentElement).appendChild(s);
    }

    // Debug (remove if noisy)
    if (window.console) {
      console.log('[POC] stage2-loader →', {
        file, src, isCheckout, isThankYou, host, path
      });
    }
  } catch (e) {
    try { console.warn('[POC] stage2-loader error:', e); } catch (_) {}
  }
})();
