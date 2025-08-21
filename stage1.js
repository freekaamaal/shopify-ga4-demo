(function(){
  try{
    var W=window, D=document;

    // figure out our base path so we can load siblings
    var CS=D.currentScript || (function(){var s=D.getElementsByTagName('script');return s[s.length-1];})();
    var SRC=(CS&&CS.src)||'';
    var BASE=(function(){ try{ var u=new URL(SRC); return u.origin+u.pathname.replace(/\/[^\/]*$/,''); } catch(_){ return ''; }})();
    var SQS=new URLSearchParams((SRC.split('?')[1])||'');   // supports ?v=, ?debug=1
    var VERSION=SQS.get('v')||'';
    var DEBUG=SQS.get('debug')==='1';
    function log(){ if(DEBUG && W.console) try{ console.log.apply(console, ['[AF]'].concat([].slice.call(arguments))); }catch(_){} }

    var RULES_URL=BASE+'/rules.json'+(VERSION?('?v='+encodeURIComponent(VERSION)):'');
    var TIMEOUT_MS=1000;

    function withTimeout(p,ms){ return new Promise(function(res){ var done=false,t=setTimeout(function(){if(!done){done=true;res(null)}},ms); p.then(function(v){if(!done){done=true;clearTimeout(t);res(v)}}).catch(function(){if(!done){done=true;clearTimeout(t);res(null)}}); }); }
    function refHost(u){ try{ return u?new URL(u).host:'' }catch(_){ return '' } }
    function wildcard(host, pat){ if(!pat||pat==='*'||pat===host) return true; if(pat.slice(0,2)==='*.'){var b=pat.slice(2);return host===b||host.endsWith('.'+b)} return false; }
    function domainOK(list, host){ if(!list||!list.length) return true; for(var i=0;i<list.length;i++){ if(wildcard(host,list[i])) return true; } return false; }
    function pathHasAny(list, path){ if(!list||!list.length) return true; path=path.toLowerCase(); for(var i=0;i<list.length;i++){ var s=String(list[i]||'').toLowerCase(); if(!s) continue; if(path.indexOf(s)!==-1) return true; } return false; }
    function pathHasNone(list, path){ if(!list||!list.length) return true; path=path.toLowerCase(); for(var i=0;i<list.length;i++){ var s=String(list[i]||'').toLowerCase(); if(!s) continue; if(path.indexOf(s)!==-1) return false; } return true; }

    // context
    var host=location.host;
    var path=location.pathname||'/';
    var sp=new URLSearchParams(location.search||'');
    var utm_source_raw=sp.get('utm_source');
    var utm_source = (utm_source_raw==null || utm_source_raw==='') ? '' : String(utm_source_raw).toLowerCase();
    log('boot',{BASE,host,path,utm_source});

    // load rules
    withTimeout(fetch(RULES_URL,{credentials:'omit',cache:'no-store'}).then(function(r){return r&&r.ok?r.json():null;}), TIMEOUT_MS)
    .then(function(cfg){
      var action='keep', utm=null, pci=true, gc=false, matched=null;

      if(cfg && !cfg.kill_switch){
        pci = (cfg.defaults && typeof cfg.defaults.preserveClickIds==='boolean') ? cfg.defaults.preserveClickIds : true;
        gc  = (cfg.defaults && !!cfg.defaults.preSetCampaign) || false;

        var rules = cfg.rules||[];
        outer: for(var i=0;i<rules.length;i++){
          var r=rules[i]; if(!r) continue;
          if(!domainOK(r.domains, host)) continue;
          if(!pathHasAny(r.pathIncludes, path)) continue;
          if(!pathHasNone(r.pathExcludes, path)) continue;

          // utm_source match
          if(r.match && r.match.utm_source_in){
            var list=r.match.utm_source_in.map(function(s){ return String(s||'').toLowerCase(); });
            var hit = list.indexOf(utm_source)!==-1;
            // Treat "" as 'empty or absent'
            if(!hit && utm_source==='' && list.indexOf('')!==-1) hit=true;
            if(!hit) continue;
          }

          // outcome
          var out=r.outcome||{};
          action = (out.action==='change') ? 'change' : 'keep';
          utm = out.utm || null;
          if(typeof out.preserveClickIds==='boolean') pci=out.preserveClickIds;
          if(typeof out.preSetCampaign==='boolean')    gc =out.preSetCampaign;
          matched = r.name || ('rule_'+i);
          break outer;
        }
      } else {
        log('rules missing or kill_switch');
      }

      log('decision',{action,utm,pci,gc,matched});

      // load stage2 based on decision
      var q=new URLSearchParams({
        us:(utm&&utm.source)||'',
        um:(utm&&utm.medium)||'',
        uc:(utm&&utm.campaign)||'',
        pci:String(!!pci),
        gc:String(!!gc)
      });
      var s=D.createElement('script'); s.async=true; s.referrerPolicy='no-referrer';
      s.src=BASE + (action==='change' ? '/stage2-change.js?' : '/stage2-keep.js?') + q.toString() + '&ts=' + Date.now();
      (D.head||D.documentElement).appendChild(s);
      log('loaded', s.src);
    });

  }catch(e){ try{console.warn('stage1 error',e);}catch(_){ } }
})();
