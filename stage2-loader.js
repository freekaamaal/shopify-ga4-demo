// stage2-loader.js
(function () {
  try {
    /* ===== CONFIG ===== */
    var BASE = 'https://freekaamaal.github.io/shopify-ga4-demo/'; // folder hosting your final scripts
    var REQUIRE_POC_PARAM = false; // set true to only run when URL has ?poc=1

    /* ===== GUARDS / CONTEXT ===== */
    var host = window.location.hostname;
    var path = window.location.pathname;
    var query = window.location.search || '';

    if (REQUIRE_POC_PARAM && !/[?&]poc=1\b/.test(query)) return;

    var isCheckout = /\/checkouts\//i.test(path);
    var isThankYou = /thank[_-]?you/i.test(path);

    /* ===== PICK FILE =====
       - checkout steps (contact/shipping/payment) → demo-final-checkout.js
       - thank-you (order status) and everything else → demo-final.js
    */
    var file = (isCheckout && !isThankYou)
      ? 'demo-final-checkout.js'
      : 'demo-final.js';

    var src = BASE + file + '?domain=' + encodeURIComponent(host) + '&v=' + Date.now();

    /* ===== INJECT EARLY (before first <script>) ===== */
    var s = document.createElement('script');
    s.async = true;
    s.src = src;

    var first = document.getElementsByTagName('script')[0];
    if (first && first.parentNode) {
      first.parentNode.insertBefore(s, first);
    } else {
      (document.head || document.documentElement).appendChild(s);
    }

    // Debug (remove if noisy)
    if (window.console && console.log) {
      console.log('[POC] stage2-loader →', { file, src, isCheckout, isThankYou, host, path });
    }
  } catch (e) {
    try { console.warn('[POC] stage2-loader error:', e); } catch (_) {}
  }
})();
