(function(){
  var ALLOWED_DOMAINS = ['shop.freekaamaal.com'];
  var NEW_CAMPAIGN = { source: 'Vicky-Checkout-Demo', medium: '(none)', name: 'POC-hijack' };
  var RUN_ONCE_FLAG = 'poc_ga_overwrite_done';
  var MAX_WAIT_MS = 8000, CHECK_MS = 200;

  if (ALLOWED_DOMAINS.indexOf(location.hostname) === -1) return;

  function isThankYou(){
    try { if (window.Shopify && Shopify.checkout && Shopify.checkout.order_id) return true; } catch(_){}
    return /thank[_-]?you/i.test(location.href) || /\/checkouts\/.*\/thank_you/i.test(location.href);
  }
  if (!isThankYou()) return;

  if (sessionStorage.getItem(RUN_ONCE_FLAG)) return;
  sessionStorage.setItem(RUN_ONCE_FLAG, '1');

  // Update visible URL UTM params
  try {
    var url = new URL(location.href);
    url.searchParams.set('utm_source', NEW_CAMPAIGN.source);
    if (NEW_CAMPAIGN.medium) url.searchParams.set('utm_medium', NEW_CAMPAIGN.medium);
    if (NEW_CAMPAIGN.name) url.searchParams.set('utm_campaign', NEW_CAMPAIGN.name);
    history.replaceState({}, '', url);
  } catch(_) {}

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event:'poc_campaign_override', poc_campaign_source: NEW_CAMPAIGN.source});

  function sendEvents(){
    if (typeof window.gtag !== 'function') return false;

    // Start a new session
    window.gtag('event', 'session_start', { debug_mode: true });

    // Force page_view with campaign override
    window.gtag('event', 'page_view', {
      campaign: {
        source: NEW_CAMPAIGN.source,
        medium: NEW_CAMPAIGN.medium || undefined,
        name: NEW_CAMPAIGN.name || undefined
      },
      session_id: Date.now(),
      debug_mode: true
    });

    // Send purchase event
    if (window.Shopify && Shopify.checkout) {
      var c = Shopify.checkout;
      var items = (c.line_items || []).map(function(li){
        return {
          item_id: li.product_id || li.sku || String(li.id || ''),
          item_name: li.title || 'Item',
          quantity: li.quantity || 1,
          price: Number(li.price) / 100 || undefined
        };
      });

      window.gtag('event', 'purchase', {
        transaction_id: String(c.order_id || c.order_number || Date.now()),
        value: Number(c.total_price) / 100 || 0,
        currency: c.presentment_currency || c.currency || 'INR',
        affiliation: 'POC-ClientSide',
        coupon: (c.discount && c.discount.code) ? c.discount.code : undefined,
        shipping: Number(c.shipping_price) / 100 || 0,
        tax: Number(c.total_tax) / 100 || 0,
        items: items,
        campaign: {
          source: NEW_CAMPAIGN.source,
          medium: NEW_CAMPAIGN.medium || undefined,
          name: NEW_CAMPAIGN.name || undefined
        },
        debug_mode: true
      });
    }

    return true;
  }

  var waited = 0;
  var iv = setInterval(function(){
    waited += CHECK_MS;
    if (sendEvents() || waited >= MAX_WAIT_MS) clearInterval(iv);
  }, CHECK_MS);

})();
