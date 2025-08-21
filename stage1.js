(function(){
  try{
    var W=window, D=document;

    // ---- find our base URL (so stage2+rules load from same folder)
    var CS = D.currentScript || (function(){var s=D.getElementsByTagName('script');return s[s.length-1];})();
    var SRC = (CS && CS.src) || '';
    var BASE = (function(){ try{ var u=new URL(SRC); return u.origin + u.pathname.replace(/\/[^\/]*$/,''); } catch(_){ return ''; } })();

    // ---- debug flag via script src: …/stage1.js?debug=1
    var P = new URLSearchParams((SRC.split('?')[1])||'');
    var DEBUG = P.get('debug') === '1';

    function log(){ if(DEBUG && W.console) try{ console.log.apply(console, ['[AF]'].concat([].slice.call(arguments))); }catch(_){} }

    var RULES_URL = BASE + '/rules.json';
    var TIMEOUT_MS = 800; // was 150; GH Pages/CDNs can be slower

    // helpers
    function getQS(){ return new URLSearchParams(location.search || ''); }
    function refHost(u){ try{ return u ? new URL(u).host : ''; }catch(_){ return ''; } }
    function wildcard(host, pat){
      if (!pat || pat==='*' || pat===host) return true;
      if (pat.slice(0,2)==='*.'){ var base=pat.slice(2); return host===base || host.slice(-('.'+base).length)===('.'+base); }
      return false;
    }
    function domainAllowed(list, host){
      if (!list || !list.length) return true;
      for (var i=0;i<list.length;i++){ if (wildcard(host, list[i])) return true; }
      return false;
    }
    function reHit(list, str){
      if (!list || !list.length) return true;
      for (var i=0;i<list.length;i++){ try{ if (new RegExp(list[i]).test(str)) return true; }catch(_){ } }
      return false;
    }
    function withTimeout(p, ms){
      return new Promise(function(res){
        var done=false; var t=setTimeout(function(){ if(!done){done=true; res(null);} }, ms);
        p.then(function(v){ if(!done){done=true; clearTimeout(t); res(v);} })
         .catch(function(){ if(!done){done=true; clearTimeout(t); res(null);} });
      });
    }

    // context
    var sp = getQS();
    var host = location.host;
    var path = location.pathname || '/';
    var ref = document.referrer || '';
    var rh  = refHost(ref);
    var hasUTM = (sp.has('utm_source')||sp.has('utm_medium')||sp.has('utm_campaign'));
    var isDirect = (!ref && !hasUTM);
    log('boot', {BASE, RULES_URL, host, path, rh, hasUTM, isDirect});

    // fetch rules
    withTimeout(fetch(RULES_URL, {credentials:'omit', cache:'no-store'}).then(function(r){return r.ok?r.json():null;}), TIMEOUT_MS)
      .then(function(cfg){
        var action='keep', utm=null, preserveClickIds=true, matched=null;

        if (cfg && !cfg.kill_switch){
          preserveClickIds = cfg.defaults && typeof cfg.defaults.preserveClickIds==='boolean' ? cfg.defaults.preserveClickIds : true;
          var rules = cfg.rules || [];

          // normalize common PDP pattern: if caller used "^/products?/" we’ll also test /^\/(collections\/[^\/]+\/)?products\//
          var altPdpRegex = '^\\/(?:collections\\/[^\\/]+\\/)?products\\/';

          for (var i=0;i<rules.length;i++){
            var r = rules[i]; if (!r || r.enabled===false) continue;
            if (!domainAllowed(r.domains, host)) continue;

            var includeOk = true;
            if (r.includePathRe && r.includePathRe.length){
              includeOk = reHit(r.includePathRe, path);
              // augment include match for common PDP if requested
              if (!includeOk && r.includePathRe.some(function(s){return /^\\^?\\/?products?\\//.test(s);})){
                includeOk = (new RegExp(altPdpRegex)).test(path);
              }
            }
            if (!includeOk) continue;

            if (reHit(r.excludePathRe, path)) continue;
            if (r.referrerMatches && r.referrerMatches.length && !reHit(r.referrerMatches, rh)) continue;
            if (r.whenHasUTM === true && !hasUTM) continue;
            if (r.onlyDirect === true && !isDirect) continue;

            action = (r.action === 'change') ? 'change' : 'keep';
            utm = r.utm || (cfg.domainDefaults && cfg.domainDefaults[host] && cfg.domainDefaults[host].utm) || null;
            matched = r.name || ('rule_'+i);
            break;
          }
        } else {
          log('rules missing or kill_switch true → KEEP');
        }

        log('decision', {action, utm, preserveClickIds, matched});

        // load stage2 based on decision
        var q = new URLSearchParams({
          action: action,
          us: (utm && utm.source) || '',
          um: (utm && utm.medium) || '',
          uc: (utm && utm.campaign) || '',
          pci: String(!!preserveClickIds)
        });

        var s = D.createElement('script'); s.async=true; s.referrerPolicy='no-referrer';
        s.src = BASE + (action==='change' ? '/stage2-change.js?' : '/stage2-keep.js?') + q.toString() + '&ts=' + Date.now();
        (D.head||D.documentElement).appendChild(s);

        log('loaded', s.src);
      });

  }catch(e){ try{console.warn('stage1 error',e);}catch(_){ } }
})();
