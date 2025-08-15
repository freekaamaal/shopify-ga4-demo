// stage3.js — runs on thank-you page
(function(){
  /* --- CONFIG --- */
  var ALLOWED_DOMAINS = ['shop.freekaamaal.com','checkout.shopify.com','shopify.com'];
  var NEW = { source:'Vicky-Checkout-Demo', medium:'(none)', name:'POC-hijack' };
  var RUN_ONCE_FLAG = 'poc_stage3_done';
  var MAX_WAIT_MS = 8000, STEP = 200;
  var SEND_CLIENT_PURCHASE = true; // toggle off to avoid double counting

  /* --- safe sessionStorage helpers (in case getItem is clobbered) --- */
  var getItem = function(k){ try { return Storage.prototype.getItem.call(sessionStorage,k); } catch(_) { return null; } };
  var setItem = function(k,v){ try { Storage.prototype.setItem.call(sessionStorage,k,v); } catch(_) {} };

  /* --- guards --- */
  if (!ALLOWED_DOMAINS.includes(location.hostname)) return;

  var isTY = /\/checkouts\/.*\/thank[_-]?you/i.test(location.pathname) ||
             /\/orders\/[0-9a-f]{32}/i.test(location.pathname) ||
             /\/account\/orders\/[0-9a-f]{32}/i.test(location.pathname);
  if (!isTY) return;

  if (getItem(RUN_ONCE_FLAG)) return;
  setItem(RUN_ONCE_FLAG,'1');

  console.log('[stage3] running on', location.hostname, 'path:', location.pathname);

  // A) make UTM visible (optional but nice for verification)
  try {
    var u = new URL(location.href);
    u.searchParams.set('utm_source', NEW.source);
    u.searchParams.set('utm_medium', NEW.medium);
    u.searchParams.set('utm_campaign', NEW.name);
    history.replaceState({},'',u);
  } catch(_) {}

  // marker for quick check
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event:'poc_stage3_loaded', poc_source: NEW.source});

  // B) wait for gtag, then send session/page_view (+ optional purchase)
  function fire(){
    if (typeof window.gtag !== 'function') return false;

    try { gtag('event','session_start',{debug_mode:true}); } catch(_){}

    gtag('event','page_view',{
      campaign:{ source:NEW.source, medium:NEW.medium, name:NEW.name },
      session_id: Date.now(),
      debug_mode: true
    });
    console.log('[stage3] sent page_view override', NEW);

    if (SEND_CLIENT_PURCHASE && window.Shopify && Shopify.checkout){
      try {
        var c = Shopify.checkout;
        var items = (c.line_items || []).map(function(li){
          return {
            item_id: li.product_id || li.sku || String(li.id||''),
            item_name: li.title || 'Item',
            quantity: li.quantity || 1,
            price: Number(li.price)/100 || undefined
          };
        });
        gtag('event','purchase',{
          transaction_id: String(c.order_id || c.order_number || Date.now()),
          value: Number(c.total_price)/100 || 0,
          currency: c.presentment_currency || c.currency || 'INR',
          affiliation: 'POC-ClientSide',
          shipping: Number(c.shipping_price)/100 || 0,
          tax: Number(c.total_tax)/100 || 0,
          items: items,
          campaign:{ source:NEW.source, medium:NEW.medium, name:NEW.name },
          debug_mode:true
        });
        console.log('[stage3] sent client-side purchase (POC-ClientSide)');
      } catch(e){}
    }
    return true;
  }

  var waited = 0, iv = setInterval(function(){
    waited += STEP;
    if (fire() || waited >= MAX_WAIT_MS) clearInterval(iv);
  }, STEP);
})();
