(function(){
  // ===== CONFIG =====
  var ALLOWED_DOMAINS = ['shop.freekaamaal.com','checkout.shopify.com','shopify.com'];
  var NEW_CAMPAIGN = { source: 'Vicky-Checkout-Demo', medium: '(none)', name: 'POC-hijack' };
  var SEND_CLIENT_PURCHASE = true; // set false to avoid double counting during tests
  var RUN_ONCE_FLAG = 'poc_ga_overwrite_done';
  var MAX_WAIT_MS = 8000, CHECK_MS = 200;

  // ===== SAFE sessionStorage (guards against clobbered methods) =====
  var safeGet = function(s,k){ try { return Storage.prototype.getItem.call(s,k); } catch(_) { return null; } };
  var safeSet = function(s,k,v){ try { Storage.prototype.setItem.call(s,k,v); } catch(_) {} };

  // ===== GUARDS =====
  var host = location.hostname;
  if (ALLOWED_DOMAINS.indexOf(host) === -1) return;

  function isThankYou(){
    try { if (window.Shopify && Shopify.checkout && Shopify.checkout.order_id) return true; } catch(_){}
    var p = location.pathname;
    return /\/checkouts\/[^/]+\/thank(?:_|-)you/i.test(p)     // canonical TY
        || /\/orders\/[0-9a-f]{32}/i.test(p)                 // order status hash
        || /thank(?:_|-)you/i.test(p);                       // fallback
  }
  if (!isThankYou()) return;

  if (safeGet(sessionStorage, RUN_ONCE_FLAG)) return;
  safeSet(sessionStorage, RUN_ONCE_FLAG, '1');

  // ===== A) Make UTMs visible (helps verify) =====
  try {
    var url = new URL(location.href);
    url.searchParams.set('utm_source', NEW_CAMPAIGN.source);
    if (NEW_CAMPAIGN.medium) url.searchParams.set('utm_medium', NEW_CAMPAIGN.medium);
    if (NEW_CAMPAIGN.name)   url.searchParams.set('utm_campaign', NEW_CAMPAIGN.name);
    history.replaceState({}, '', url);
  } catch(_) {}

  // Marker for quick check
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event:'poc_campaign_override', poc_campaign_source: NEW_CAMPAIGN.source});

  // ===== B) Wait for gtag, then new session + page_view (+ optional purchase) =====
  function fire(){
    if (typeof window.gtag !== 'function') return false;

    try { gtag('event','session_start',{debug_mode:true}); } catch(_){}

    gtag('event','page_view',{
      campaign: {
        source: NEW_CAMPAIGN.source,
        medium: NEW_CAMPAIGN.medium || undefined,
        name:   NEW_CAMPAIGN.name   || undefined
      },
      session_id: Date.now(),
      debug_mode: true
    });

    if (SEND_CLIENT_PURCHASE && window.Shopify && Shopify.checkout){
      try {
        var c = Shopify.checkout;
        var items = (c.line_items || []).map(function(li){
          return {
            item_id:   li.product_id || li.variant_id || li.sku || String(li.id||''),
            item_name: li.title || 'Item',
            quantity:  Number(li.quantity || 1),
            price:     (li.price!=null ? Number(li.price)/100 : undefined) // cents→unit
          };
        });
        gtag('event','purchase',{
          transaction_id: String(c.order_id || c.order_number || Date.now()),
          value:          (c.total_price!=null ? Number(c.total_price)/100 : 0),
          currency:       c.presentment_currency || c.currency || 'INR',
          affiliation:    'POC-ClientSide',
          coupon:         (c.discount && c.discount.code) ? c.discount.code : undefined,
          shipping:       (c.shipping_price!=null ? Number(c.shipping_price)/100 : 0),
          tax:            (c.total_tax!=null ? Number(c.total_tax)/100 : 0),
          items:          items,
          campaign: {
            source: NEW_CAMPAIGN.source,
            medium: NEW_CAMPAIGN.medium || undefined,
            name:   NEW_CAMPAIGN.name   || undefined
          },
          debug_mode: true
        });
      } catch(e){}
    }
    return true;
  }

  var waited = 0, iv = setInterval(function(){
    waited += CHECK_MS;
    if (fire() || waited >= MAX_WAIT_MS) clearInterval(iv);
  }, CHECK_MS);
})();
