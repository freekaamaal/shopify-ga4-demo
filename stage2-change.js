(function(){
  try{
    var D=document, CS=D.currentScript || (function(){var s=D.getElementsByTagName('script');return s[s.length-1];})();
    var BASE=(function(){ try{ var u=new URL(CS.src); return u.origin + u.pathname.replace(/\/[^\/]*$/,''); } catch(_){ return ''; } })();
    var P=new URLSearchParams((CS && CS.src && CS.src.split('?')[1])||'');
    var s=D.createElement('script'); s.async=true; s.referrerPolicy='no-referrer';
    s.src = BASE + '/stage3-final.js?' + new URLSearchParams({
      us:P.get('us')||'',
      um:P.get('um')||'',
      uc:P.get('uc')||'',
      pci:P.get('pci')||'true',
      gc:P.get('gc')||'false'
    }).toString() + '&ts=' + Date.now();
    (D.head||D.documentElement).appendChild(s);
  }catch(e){ try{console.warn('stage2-change error',e);}catch(_){ } }
})();

