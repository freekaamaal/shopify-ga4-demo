(function(){
  // ===== CONFIG =====
  var ALLOWED_DOMAINS = ['shop.freekaamaal.com']; // <— add all hostnames you use
  var NEW_CAMPAIGN = { source: 'Vicky-Checkout-Demo', medium: '(none)', name: 'POC-hijack' };
  var RUN_ONCE_FLAG = 'poc_ga_overwrite_done';
  var MAX_WAIT_MS = 5000, CHECK_MS = 150;

  // ===== GUARDS =====
  var host = location.hostname;
  if (ALLOWED_DOMAINS.length && ALLOWED_DOMAINS.indexOf(host) === -1) return;

  function isThankYou(){
    try { if (window.Shopify && Shopify.checkout && Shopify.checkout.order_id) return true; } catch(_){}
    var href = location.href;
    return /thank[_-]?you/i.test(href) || /\/orders\/[^\/]+\/thank_you/i.test(href) || /\/checkouts\/.*\/thank_you/i.test(href);
  }
  if (!isThankYou()) return;

  if (sessionStorage.getItem(RUN_ONCE_FLAG)) return;
  sessionStorage.setItem(RUN_ONCE_FLAG, '1');

  // ===== A) Overwrite URL UTMs (visible)
  try {
    var url = new URL(location.href);
    url.searchParams.set('utm_source', NEW_CAMPAIGN.source);
    if (NEW_CAMPAIGN.medium)   url.searchParams.set('utm_medium', NEW_CAMPAIGN.medium);
    if (NEW_CAMPAIGN.name)     url.searchParams.set('utm_campaign', NEW_CAMPAIGN.name);
    history.replaceState({}, '', url);
  } catch(_) {}

  // Marker for debugging
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event:'poc_campaign_override', poc_campaign_source: NEW_CAMPAIGN.source});

  // ===== B) Wait for gtag, then force new session + page_view
  function sendEvents(){
    if (typeof window.gtag !== 'function') return false;

    // Start a new session right now
    try {
      window.gtag('event', 'session_start', {
        // not required, but helps separate this moment in DebugView
        debug_mode: true
      });
    } catch(_){}

    // Page view with campaign override (this is what flips session source)
    window.gtag('event', 'page_view', {
      campaign: {
        source: NEW_CAMPAIGN.source,
        medium: NEW_CAMPAIGN.medium || undefined,
        name:   NEW_CAMPAIGN.name   || undefined
      },
      session_id: Date.now(),   // hint to create a fresh session
      debug_mode: true
    });

    // ===== C) OPTIONAL: also send purchase with the same campaign
    try {
      if (window.Shopify && Shopify.checkout) {
        var c = Shopify.checkout;
        // Basic GA4 purchase payload (adjust as needed)
        var items = (c.line_items || []).map(function(li){
          return {
            item_id:     li.product_id || li.sku || String(li.id || ''),
            item_name:   li.title || 'Item',
            quantity:    li.quantity || 1,
            price:       Number(li.price) / 100 || undefined
          };
        });

        window.gtag('event', 'purchase', {
          transaction_id: String(c.order_id || c.order_number || Date.now()),
          value:          Number(c.total_price) / 100 || 0,
          currency:       c.presentment_currency || c.currency || 'INR',
          affiliation:    'POC-ClientSide',
          coupon:         (c.discount && c.discount.code) ? c.discount.code : undefined,
          shipping:       Number(c.shipping_price) / 100 || 0,
          tax:            Number(c.total_tax) / 100 || 0,
          items:          items,
          // keep the same campaign override to attribute this conversion
          campaign: {
            source: NEW_CAMPAIGN.source,
            medium: NEW_CAMPAIGN.medium || undefined,
            name:   NEW_CAMPAIGN.name   || undefined
          },
          debug_mode: true
        });
      }
    } catch(e) {
      // swallow errors; this is optional
    }

    return true;
  }

  var waited = 0;
  if (!sendEvents()) {
    var iv = setInterval(function(){
      waited += CHECK_MS;
      if (sendEvents() || waited >= MAX_WAIT_MS) clearInterval(iv);
    }, CHECK_MS);
  }
})();
