(function(){
  var ALLOWED_DOMAINS = ['shop.freekaamaal.com'];
  var NEW_CAMPAIGN = { source: 'Vicky-Checkout-Demo', medium: '(none)', name: 'POC-hijack' };
  var SEND_CLIENT_PURCHASE = true;           // ← toggle to avoid double count
  var RUN_ONCE_FLAG = 'poc_ga_overwrite_done';
  var MAX_WAIT_MS = 8000, CHECK_MS = 150;

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

  console.log('[POC] thank-you override running on', host);

  try {
    var url = new URL(location.href);
    url.searchParams.set('utm_source', NEW_CAMPAIGN.source);
    if (NEW_CAMPAIGN.medium) url.searchParams.set('utm_medium', NEW_CAMPAIGN.medium);
    if (NEW_CAMPAIGN.name)   url.searchParams.set('utm_campaign', NEW_CAMPAIGN.name);
    history.replaceState({}, '', url);
  } catch(_) {}

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event:'poc_campaign_override', poc_campaign_source: NEW_CAMPAIGN.source});

  function sendEvents(){
    if (typeof window.gtag !== 'function') return false;

    try { window.gtag('event', 'session_start', { debug_mode: true }); } catch(_){}

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

    if (SEND_CLIENT_PURCHASE && window.Shopify && Shopify.checkout) {
      try {
        var c = Shopify.checkout;
        var items = (c.line_items || []).map(function(li){
          return {
            item_id:   li.product_id || li.sku || String(li.id || ''),
            item_name: li.title || 'Item',
            quantity:  li.quantity || 1,
            price:     Number(li.price) / 100 || undefined  // Shopify is cents
          };
        });
        window.gtag('event', 'purchase', {
          transaction_id: String(c.order_id || c.order_numb_
