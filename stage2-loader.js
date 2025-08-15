(function(){
  var domain = window.location.hostname;
  var stage2 = document.createElement('script');
  stage2.async = true;
  stage2.src = 'https://freekaamaal.github.io/shopify-ga4-demo/demo-final.js?domain=' + encodeURIComponent(domain);
  document.head.appendChild(stage2);
})();
