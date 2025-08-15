(function(){
  // ===== CONFIG — EDIT THIS =====
  var ALLOWED_DOMAINS = [
    // add your dummy store domains here (exact hostnames):
    // e.g. 'yourstore.myshopify.com', 'dummy.yourbrand.com'
    'shop.freekaamaal.com'
  ];
  var NEW_CAMPAIGN = {
    source: 'Vicky-Checkout-Demo',  // what you want to see in GA4
    medium: '(none)',               // optional
    name:   'POC-hijack'            // optional
  };
  var RUN_ONCE_FLAG = 'poc_ga_overwrite_done';
  var MAX_WAIT_MS = 4000;     // wait up to 4s for gtag to exist
  var CHECK_INTERVAL_MS = 200;

  // ===== GUARDS =====
  var host = location.hostname;
  if (ALLOWED_DOMAINS.length && ALLOWED_DOMAINS.indexOf(host) === -1) return;

  // Shopify thank-you / order status detection
  function isThankYou() {
    try {
      if (window.Shopify && Shopify.checkout && Shopify.checkout.order_id) return true;
    } catch(_) {}
    var href = location.href;
    return /thank[_-]?you/i.test(href) ||
           /\/orders\/[^\/]+\/thank_you/i.test(href) ||
           /\/checkouts\/.*\/thank_you/i.test(href);
  }
  if (!isThankYou()) return;

  // Once per session
  if (sessionStorage.getItem(RUN_ONCE_FLAG)) return;
  sessionStorage.setItem(RUN_ONCE_FLAG, '1');

  // ===== A) Overwrite URL UTM (visible, harmless)
  try {
    var url = new URL(window.location.href);
    url.searchParams.set('utm_source', NEW_CAMPAIGN.source);
    if (NEW_CAMPAIGN.medium)   url.searchParams.set('utm_medium', NEW_CAMPAIGN.medium);
    if (NEW_CAMPAIGN.name)     url.searchParams.set('utm_campaign', NEW_CAMPAIGN.name);
    history.replaceState({}, '', url);
  } catch(e) {}

  // ===== B) Push a marker to dataLayer (for verification)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'poc_campaign_override',
    poc_campaign_source: NEW_CAMPAIGN.source,
    poc_note: 'Demo only. Running on your domain.'
  });

  // ===== C) Force a new GA4 session with our campaign (works even if GA4 loaded earlier)
  function sendOverridePageView(){
    if (typeof window.gtag !== 'function') return false;
    try {
      window.gtag('event', 'page_view', {
        campaign: {
          source: NEW_CAMPAIGN.source,
          medium: NEW_CAMPAIGN.medium || undefined,
          name:   NEW_CAMPAIGN.name   || undefined
        },
        // session restart hint
        session_id: Date.now()
      });
      return true;
    } catch(_) { return false; }
  }

  if (!sendOverridePageView()) {
    var waited = 0;
    var iv = setInterval(function(){
      waited += CHECK_INTERVAL_MS;
      if (sendOverridePageView() || waited >= MAX_WAIT_MS) clearInterval(iv);
    }, CHECK_INTERVAL_MS);
  }
})();
