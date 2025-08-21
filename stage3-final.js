(function(){
  try{
    var W=window, D=document;
    var CS=D.currentScript || (function(){var s=D.getElementsByTagName('script');return s[s.length-1];})();
    var P=new URLSearchParams((CS && CS.src && CS.src.split('?')[1])||'');

    var UTM = { source:P.get('us')||'', medium:P.get('um')||'', campaign:P.get('uc')||'' };
    var PRESERVE = (P.get('pci')||'true')==='true';

    function copyClickIds(fromSP,toSP){
      ['gclid','gbraid','wbraid','fbclid','msclkid','ttclid','li_fat_id','yclid'].forEach(function(k){
        var v=fromSP.get(k); if(v) toSP.set(k,v);
      });
    }

    function rewrite(){
      if (!UTM.source && !UTM.medium && !UTM.campaign) return false;
      try{
        var u = new URL(location.href);
        if (UTM.source)   u.searchParams.set('utm_source', UTM.source);
        if (UTM.medium)   u.searchParams.set('utm_medium', UTM.medium);
        if (UTM.campaign) u.searchParams.set('utm_campaign', UTM.campaign);
        if (PRESERVE) copyClickIds(new URLSearchParams(location.search), u.searchParams);
        var changed = (u.toString() !== location.href);
        if (changed) history.replaceState(history.state, '', u.toString());
        return changed;
      }catch(_){ return false; }
    }

    rewrite(); // no GA calls here; pure URL change as requested
  }catch(e){ try{console.warn('stage3-final error',e);}catch(_){ } }
})();
