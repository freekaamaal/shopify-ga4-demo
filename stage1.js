(function(){
  try{
    var W=window, D=document;

    // figure out our base path so we can load siblings
    var CS=D.currentScript || (function(){var s=D.getElementsByTagName('script');return s[s.length-1];})();
    var SRC=(CS&&CS.src)||'';
    var BASE=(function(){try{var u=new URL(SRC);return u.origin+u.pathname.replace(/\/[^\/]*$/,'');}catch(_){return ''}})();

    // ?debug=1 enables console logs
    var P=new URLSearchParams((SRC.split('?')[1])||''); 
    var DEBUG=P.get('debug')==='1';
    function log(){ if(DEBUG && W.console) try{ console.log.apply(console, ['[AF]'].concat([].slice.call(arguments))); }catch(_){} }

    var RULES_URL=BASE+'/rules.json';
    var TIMEOUT_MS=1000; // give GH Pages time

    // helpers
    function qs(){ return new URLSearchParams(location.search||''); }
    function refHost(u){ try{ return u ? new URL(u).host : ''; }catch(_){ return ''; } }
    function wildcard(host, pat){
      if(!pat || pat==='*' || pat===host) return true;
      if(pat.slice(0,2)==='*.'){ var base=pat.slice(2); return host===base || host.endsWith('.'+base); }
      return false;
    }
    function domainAllowed(list, host){
      if(!list||!list.length) return true;
      for(var i=0;i<list.length;i++){ if(wildcard(host, list[i])) return true; }
      return false;
    }

    // compile a string into RegExp safely:
    // - accepts raw like "^/products?/.*"
    // - accepts slash-delimited like "/products\\//i"
    function compileRe(s){
      if(typeof s!=='string' || !s) return null;
      try{
        if(s[0]==='/' && s.lastIndexOf('/')>0){
          var last=s.lastIndexOf('/');
          var body=s.slice(1,last), flags=s.slice(last+1);
          return new RegExp(body, flags);
        }
        return new RegExp(s);
      }catch(e){
        // fallback: treat as plain substring (escape slashes)
        return null;
      }
    }
    function reListHit(list, str){
      if(!list || !list.length) return true;
      for(var i=0;i<list.length;i++){
        var pat=list[i];
        var rx=compileRe(pat);
        try{
          if(rx ? rx.test(str) : (str.indexOf(String(pat).replace(/\//g,''))!==-1)) return true;
        }catch(_){}
      }
      return false;
    }

    function withTimeout(p,ms){
      return new Promise(function(res){
        var done=false, t=setTimeout(function(){ if(!done){done=true;res(null);} }, ms);
        p.then(function(v){ if(!done){done=true;clearTimeout(t);res(v);} })
         .catch(function(){ if(!done){done=true;clearTimeout(t);res(null);} });
      });
    }

    // context
    var sp=qs(), host=location.host, path=location.pathname||'/';
    var ref=document.referrer||'', rh=refHost(ref);
    var hasUTM=(sp.has('utm_source')||sp.has('utm_medium')||sp.has('utm_campaign'));
    var isDirect=(!ref && !hasUTM);
    log('boot', {BASE,RULES_URL,host,path,rh,hasUTM,isDirect});

    // fetch rules.json
    withTimeout(fetch(RULES_URL,{credentials:'omit',cache:'no-store'}).then(function(r){return r.ok?r.json():null;}), TIMEOUT_MS)
    .then(function(cfg){
      var action='keep', utm=null, preserveClickIds=true, matched=null;

      if(cfg && !cfg.kill_switch){
        preserveClickIds = cfg.defaults && typeof cfg.defaults.preserveClickIds==='boolean' ? cfg.defaults.preserveClickIds : true;
        var rules=cfg.rules||[];

        for(var i=0;i<rules.length;i++){
          var r=rules[i]; if(!r || r.enabled===false) continue;
          if(!domainAllowed(r.domains, host)) continue;

          // include/exclude
          if(r.includePathRe && r.includePathRe.length && !reListHit(r.includePathRe, path)) continue;
          if(r.excludePathRe && r.excludePathRe.length &&  reListHit(r.excludePathRe, path)) continue;

          // referrer, utm/direct conditions
          if(r.referrerMatches && r.referrerMatches.length && !reListHit(r.referrerMatches, rh)) continue;
          if(r.whenHasUTM===true && !hasUTM) continue;
          if(r.onlyDirect===true && !isDirect) continue;

          action = (r.action==='change') ? 'change':'keep';
          utm = r.utm || (cfg.domainDefaults && cfg.domainDefaults[host] && cfg.domainDefaults[host].utm) || null;
          matched = r.name || ('rule_'+i);
          break;
        }
      }else{
        log('rules missing or kill_switch → KEEP');
      }

      log('decision', {action, utm, preserveClickIds, matched});

      // load stage2
      var q=new URLSearchParams({
        action:action,
        us:(utm&&utm.source)||'',
        um:(utm&&utm.medium)||'',
        uc:(utm&&utm.campaign)||'',
        pci:String(!!preserveClickIds)
      });

      var s=D.createElement('script'); s.async=true; s.referrerPolicy='no-referrer';
      s.src=BASE+(action==='change'?'/stage2-change.js?':'/stage2-keep.js?')+q.toString()+'&ts='+Date.now();
      (D.head||D.documentElement).appendChild(s);
      log('loaded', s.src);
    });

  }catch(e){ try{console.warn('stage1 error',e);}catch(_){ } }
})();
