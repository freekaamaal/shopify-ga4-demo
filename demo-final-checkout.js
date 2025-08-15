(function(){
  // ===== CONFIG =====
  var ALLOWED_DOMAINS = ['shop.freekaamaal.com']; // add any others you use
  var NEW = { source:'Vicky-Checkout-Demo', medium:'(none)', name:'POC-hijack' };

  // Safety: require ?poc=1 to run on checkout steps (remove this gate when ready to go live)
  var REQUIRE_POC_PARAM = true;
  var RUN_ONCE_FLAG = 'poc_ga_overwrite_checkout';
  var MAX_WAIT_MS = 6000, CHECK_MS = 150;

  // ===== GUARDS =====
  var host = location.hostname;
  if (ALLOWED_DOMAINS.length && ALLOWED_DOMAINS.indexOf(host) === -1) return;

  var href = location.href;
  var isCheckoutStep = /\/checkouts\//i.test(href) && !/thank[_-]?you/i.test(href);
  if (!isCheckoutStep) return;

  var hasPOC = /[?&]poc=1\b/.test(href);
  if (REQUIRE_POC_PARAM && !hasPOC) return; // only run when you add ?poc=1

  if (sessionStorage.getItem(RUN_ONCE_FLAG)) return;
  sessionStorage.setItem(RUN_ONCE_FLAG, '1');

  // ===== A) Overwrite UTMs in URL (visible)
  try {
    var u = new URL(location.href);
    u.searchParams.set('utm_source', NEW.source);
    u.searchParams.set('utm_medium', NEW.medium);
    u.searchParams.set('utm_campaign', NEW.name);
    history.replaceState({}, '', u);
  } catch(_) {}

  // ===== B) marker for quick visual check
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event:'poc_campaign_override_checkout', poc_campaign_source: NEW.source});

  // ===== C) Force session + page_view with campaign (NO purchase event here)
  function fire(){
    if (typeof window.gtag !== 'function') return false;
    try { gtag('event','session_start',{debug_mode:true}); } catch(_){}
    gtag('event','page_view',{
      campaign:{source:NEW.source, medium:NEW.medium, name:NEW.name},
      session_id: Date.now(),
      debug_mode:true
    });
    console.log('[POC] Checkout page_view override sent', NEW);
    return true;
  }

  var waited=0;
  if (!fire()){
    var iv = setInterval(function(){
      waited += CHECK_MS;
      if (fire() || waited >= MAX_WAIT_MS) clearInterval(iv);
    }, CHECK_MS);
  }
})();
