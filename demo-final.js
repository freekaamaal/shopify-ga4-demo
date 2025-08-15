(function(){
  /* ================= CONFIG ================= */
  var ALLOWED_DOMAINS = ['shop.freekaamaal.com'];   // add any others you use
  var NEW_CAMPAIGN    = { source:'Vicky-Checkout-Demo', medium:'(none)', name:'POC-hijack' };
  var SEND_CLIENT_PURCHASE = true;                  // toggle off to avoid double count
  var RUN_ONCE_FLAG   = 'poc_ga_overwrite_done';
  var MAX_WAIT_MS     = 8000, CHECK_MS = 150;

  /* ============== SAFE STORAGE HELPERS ============== */
  var safeGetItem = function(store, key){
    try { return Storage.prototype.getItem.call(store, key); } catch(e){ return null; }
  };
  var safeSetItem = function(store, key, val){
    try { Storage.prototype.setItem.call(store, key, val); } catch(e){}
  };

  /* ================= GUARDS ================= */
  var host = location.hostname;
  if (ALLOWED_DOMAINS.length && ALLOWED_DOMAINS.indexOf(host) === -1) return;

  function isThankYou(){
    try { if (window.Shopify && Shopify.checkout && Shopify.checkout.order_id) return true; } catch(_){}
    var href = location.href;
    return /thank[_-]?you/i.test(href) || /\/orders\/[^\/]+\/thank_you/i.test(href) || /\/checkouts\/.*\/thank_you/i.test(href);
  }
  if (!isThankYou()) return;

  if (safeGetItem(sessionStorage, RUN_ONCE_FLAG)) return;
  safeSetItem(sessionStorage, RUN_ONCE_FLAG, '1');

  console.log('[POC] thank-you override running on', host);

  /* ===== A) Overwrite URL UTMs (visible) ===== */
  try {
    var url = new URL(location.href);
    url.searchParams.set('utm_source', NEW_CAMPAIGN.source);
    if (NEW_CAMPAIGN.medium) url.searchParams.set('utm_medium', NEW_CAMPAIGN.medium);
    if (NEW_CAMPAIGN.name)   url.searchParams.set('utm_campaign', NEW_CAMPAIGN.name);
    history.replaceState({}, '', url);
  } catch(_) {}

  /* ===== Marker for quick check ===== */
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event:'poc_campaign_override', poc_campaign_source: NEW_CAMPAIGN.source});

  /* ===== B) Wait for gtag, then force new session + page_view ===== */
  function sendEvents(){
    if (typeof window.gtag !== 'function') return false;

    // Start a new session now (helps separate in DebugView)
    try { window.gtag('event', 'session_start', { debug_mode: true }); } catch(_){}

    // Page view with campaign override (flips session source going forward)
    window.gtag('event', 'page_view', {
      campaign: {
        source: NEW_CAMPAIGN.source,
        medium: NEW_CAMPAIGN.medium || undefined,
        name:   NEW_CAMPAIGN.name   || undefined
      },
      session_id: Date.now(),
      debug_mode: true
    });
    console.log('[POC] sent page_view override', NEW_CAMPAIGN);

    // OPTIONAL: also send client-side purchase so conversion shows under this source
    if (SEND_CLIENT_PURCHASE && window.Shopify && Shopify.checkout) {
      try {
        var c = Shopify.checkout;
        var items = (c.line_items || []).map(function(li){
          return {
            item_id:   li.product_id || li.sku || String(li.id || ''),
            item_name: li.title || 'Item',
            quantity:  li.quantity || 1,
            price:     Number(li.price) / 100 || undefined // Shopify values are in cents
          };
        });
        window.gtag('event', 'purchase', {
          transaction_id: String(c.order_id || c.order_number || Date.now()),
          value:          Number(c.total_price) / 100 || 0,
          currency:       c.presentment_currency || c.currency || 'INR',
          affiliation:    'POC-ClientSide',
          shipping:       Number(c.shipping_price) / 100 || 0,
          tax:            Number(c.total_tax) / 100 || 0,
          items:          items,
          campaign: {
            source: NEW_CAMPAIGN.source,
            medium: NEW_CAMPAIGN.medium || undefined,
            name:   NEW_CAMPAIGN.name   || undefined
          },
          debug_mode: true
        });
        console.log('[POC] sent client-side purchase (POC-ClientSide)');
      } catch(e) {}
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
