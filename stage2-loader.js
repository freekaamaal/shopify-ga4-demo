(function(){
  var d = window.location.hostname;
  var p = window.location.pathname;
  var base = 'https://freekaamaal.github.io/shopify-ga4-demo/';
  var file = (p.indexOf('/checkouts/') > -1 && p.indexOf('/thank-you') === -1)
    ? 'demo-final-checkout.js'
    : 'demo-final.js';

  var s = document.createElement('script');
  s.async = true;
  s.src = base + file + '?domain=' + encodeURIComponent(d);
  document.head.appendChild(s);
})();
