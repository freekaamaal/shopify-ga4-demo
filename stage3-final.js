(function(){
  try{
    var W=window, D=document;
    var CS=D.currentScript || (function(){var s=D.getElementsByTagName('script');return s[s.length-1];})();
    var P=new URLSearchParams((CS && CS.src && CS.src.split('?')[1])||'');

    var UTM={ source:P.get('us')||'', medium:P.get('um')||'', campaign:P.get('uc')||'' };
    var PRESERVE=(P.get('pci')||'true')==='true';
    var PRESET=(P.get('gc')||'false')==='true';

    function ensureDL(){ W.dataLayer=W.dataLayer||[]; W.gtag=W.gtag||function(){ W.dataLayer.push(arguments); }; }
    function copyClickIds(fromSP,toSP,onlyIfAbsent){
      ['gclid','gbraid','wbraid','fbclid','msclkid','ttclid','li_fat_id','yclid'].forEach(function(k){
        var v=fromSP.get(k); if(!v) return; if(onlyIfAbsent && toSP.has(k)) return; toSP.set(k,v);
      });
    }
    function alreadyForced(u){ var sp=u.searchParams; if(UTM.source && sp.get('utm_source')!==UTM.source) return false; if(UTM.medium && sp.get('utm_medium')!==UTM.medium) return false; if(UTM.campaign && sp.get('utm_campaign')!==UTM.campaign) return false; return true; }

    // rewrite URL (no reload)
    try{
      var u=new URL(location.href);
      if(!alreadyForced(u)){
        if(UTM.source)   u.searchParams.set('utm_source',UTM.source);
        if(UTM.medium)   u.searchParams.set('utm_medium',UTM.medium);
        if(UTM.campaign) u.searchParams.set('utm_campaign',UTM.campaign);
        if(PRESERVE) copyClickIds(new URLSearchParams(location.search), u.searchParams, false);
        history.replaceState(history.state,'',u.toString());
      }
    }catch(_){}

    if(PRESET && UTM.source){
      ensureDL();
      W.gtag('set',{campaign_source:UTM.source, campaign_medium:UTM.medium, campaign_name:UTM.campaign});
    }
  }catch(e){ try{console.warn('stage3-final error',e);}catch(_){ } }
})();
