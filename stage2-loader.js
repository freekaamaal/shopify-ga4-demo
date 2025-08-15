// stage2-loader.js
(function () {
  try {
    // --- CONFIG ---
    var BASE = 'https://freekaamaal.github.io/shopify-ga4-demo/'; // folder hosting your final scripts
    var REQUIRE_POC_PARAM = false; // set true if you want to gate loading via ?poc=1 during tests

    // --- GUARDS ---
    var d = window.location.hostname;
    var p = window.location.pathname;
    var q = window.location.search || '';

    if (REQUIRE_POC_PARAM && !/[?&]poc=1\b/.test(q)) return;

    // Normalize path checks
    var isCheckout = /\/checkouts\//i.test(p);
    var isThankYou = /thank[_-]?you/i.test(p);

    // Choose which final script to load
    var file = (isCheckout && !isThankYou)
      ? 'demo-final-checkout.js'   // checkout steps (contact/shipping/payment)
      : 'demo-final.js';           // thank-you and everything else

    // Build URL with diagnostics (+ cache busting so updates propagate instantly)
    var src = BASE + file + '?domain=' + encodeURIComponent(d) + '&v=' + Date.now();

    // Inject before the first <script> tag to run as early as possible
    var s = document.createElement('script');
    s.async = true;
    s.src = src;

    var firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(s, firstScript);
    } else {
      // fallback
      (document.head || document.documentElement).appendChild(s);
    }

    // Optional debug logs (remove in production)
    if (window.console && console.log) {
      console.log('[POC] stage2-loader →', { file: file, src: src, isCheckout: isCheckout, isThankYou: isThankYou, host: d, path: p });
    }
  } catch (e) {
    try { console.warn('[POC] stage2-loader error:', e); } catch (_) {}
  }
})();
