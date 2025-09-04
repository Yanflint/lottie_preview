'use strict';

/* [ANCHOR:BOOT] */
document.addEventListener('DOMContentLoaded', function () {

  /* [ANCHOR:INIT_DOM] */
  var wrapper     = document.getElementById('wrapper');
  var stage       = document.getElementById('stage');
  var bgEl        = document.getElementById('bg');

  var bgInput     = document.getElementById('bgInput');
  var lotInput    = document.getElementById('lotInput');
  var restartBtn  = document.getElementById('restartBtn');
  var loopChk     = document.getElementById('loopChk');
  var sizeBtn     = document.getElementById('sizeBtn');
  var heightBtn   = document.getElementById('heightBtn');
  var shareBtn    = document.getElementById('shareBtn');
  var fsBtn       = document.getElementById('fsBtn'); // мобильная

  var lottieLayer     = stage.querySelector('.lottie-layer');
  var lottieContainer = document.getElementById('lottie');

  /* [ANCHOR:FS_DOM] */
  var appRoot = document.querySelector('.app');

  /* [ANCHOR:STATE] */
  var anim = null, animName = null;
  var wide = false;     // 360 / 1000 (база ширины)
  var fullH = false;    // 800 / экран
  var bgDataUrl = null; // фон как dataURL
  var lastLottieJSON = null;

  /* [ANCHOR:ANTICACHE] */
  try { if (typeof lottie.setCacheEnabled === 'function') lottie.setCacheEnabled(false); } catch(e){}

  /* [ANCHOR:UTILS] */
  function uid(p){ return (p||'id_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2); }
  function afterTwoFrames(cb){ requestAnimationFrame(function(){ requestAnimationFrame(cb); }); }

  /* [ANCHOR:MOBILE_DETECT] расширенный детектор */
  function isMobile() {
    var ua = navigator.userAgent || '';
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    var smallScreen = Math.min(screen.width, screen.height) <= 820 || window.innerWidth <= 920;
    var uaMobile = /iPhone|Android|Mobile|iPod|IEMobile|Windows Phone/i.test(ua);
    return (coarse || touch || uaMobile) && smallScreen;
  }
  var MOBILE = isMobile();
  if (MOBILE) document.body.classList.add('is-mobile');

  /* [ANCHOR:RESET] */
  function renewLottieRoot(){
    try { if (anim && animName && typeof lottie.destroy === 'function') lottie.destroy(animName); } catch(_){}
    try { if (anim && anim.destroy) anim.destroy(); } catch(_){}
    anim = null; animName = null;

    if (lottieLayer && lottieLayer.parentNode) lottieLayer.parentNode.removeChild(lottieLayer);
    lottieLayer = document.createElement('div'); lottieLayer.className = 'lottie-layer';
    var newId = uid('lottie_');
    var newContainer = document.createElement('div');
    newContainer.id = newId; newContainer.className = 'lottie-container';
    newContainer.style.width='100%'; newContainer.style.height='100%';
    lottieLayer.appendChild(newContainer);
    stage.appendChild(lottieLayer);
    lottieContainer = newContainer;
  }
  function disposeAll(){
    try { if (lottie.destroy) lottie.destroy(); } catch(_){}
    renewLottieRoot();
    while (lottieContainer.firstChild) lottieContainer.removeChild(lottieContainer.firstChild);
  }

  /* [ANCHOR:APPLY_SCALE] */
  function applyScale(){
    var baseW = wide ? 1000 : 360;
    var baseH = 800;
    var SAFE_BOTTOM = 8;

    var winH    = window.innerHeight || baseH;
    var targetH = fullH ? Math.max(1, winH - SAFE_BOTTOM) : baseH;
    var targetW = fullH ? Math.round(baseW * (targetH / baseH)) : baseW;

    if (fullH) { document.body.classList.add('fs'); if (appRoot) appRoot.classList.add('fs'); }
    else       { document.body.classList.remove('fs'); if (appRoot) appRoot.classList.remove('fs'); }

    wrapper.style.width  = targetW + 'px';
    wrapper.style.height = targetH + 'px';

    if (!MOBILE) {
      if (sizeBtn)   sizeBtn.textContent   = 'Ширина: ' + targetW + 'px';
      if (heightBtn) heightBtn.textContent = 'Высота: ' + (fullH ? 'экран' : '800');
    }
  }

  /* [ANCHOR:EVENT_BINDINGS] */
  if (!MOBILE) {
    sizeBtn && sizeBtn.addEventListener('click',  function(){ wide  = !wide;  applyScale(); });
    heightBtn && heightBtn.addEventListener('click',function(){ fullH = !fullH; applyScale(); });
    window.addEventListener('resize',  function(){ if (fullH) applyScale(); });
  } else {
    window.addEventListener('resize',  function(){ if (fullH) applyScale(); });
  }
  applyScale();

  /* [ANCHOR:BG_UPLOAD] */
  bgInput && bgInput.addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      bgDataUrl = String(reader.result);
      bgEl.style.backgroundImage = 'url(' + bgDataUrl + ')';
      try { e.target.value=''; } catch(_){}
    };
    reader.readAsDataURL(file);
  });

  /* [ANCHOR:LOTTIE_LOAD] */
  function loadLottieFromData(animationData){
    disposeAll();
    animName = uid('anim_');
    lastLottieJSON = animationData;

    afterTwoFrames(function(){
      anim = lottie.loadAnimation({
        name: animName,
        container: lottieContainer,
        renderer: 'svg',
        loop: MOBILE ? true : !!(loopChk && loopChk.checked),
        autoplay: true,
        animationData: JSON.parse(JSON.stringify(animationData)),
        rendererSettings: { progressiveLoad:false, className:'lot-'+animName, preserveAspectRatio:'xMidYMid slice' }
      });

      anim.addEventListener('DOMLoaded', function(){
        try {
          var svg = lottieContainer.querySelector('svg');
          if (svg) {
            svg.removeAttribute('width'); svg.removeAttribute('height');
            svg.style.height='100%'; svg.style.width='auto'; svg.style.position='static'; svg.style.margin='0 auto';
            svg.style.left=''; svg.style.right=''; svg.setAttribute('preserveAspectRatio','xMidYMid slice');
          }
          var canvas = lottieContainer.querySelector('canvas');
          if (canvas) {
            canvas.style.height='100%'; canvas.style.width='auto'; canvas.style.position='static';
            canvas.style.margin='0 auto'; canvas.style.left=''; canvas.style.right='';
          }
        } catch(_){}
      });
    });
  }

  /* [ANCHOR:LOTTIE_UPLOAD] */
  lotInput && lotInput.addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      try { loadLottieFromData(JSON.parse(String(reader.result))); }
      catch(err){ alert('Не удалось прочитать JSON Lottie.'); }
      try { e.target.value=''; } catch(_){}
    };
    reader.readAsText(file, 'utf-8');
  });

  /* [ANCHOR:RESTART] */
  restartBtn && restartBtn.addEventListener('click', function(){
    if (!anim) return;
    try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
  });

  /* [ANCHOR:LOOP_TOGGLE] */
  loopChk && loopChk.addEventListener('change', function(){
    if (!anim) return;
    var on = loopChk.checked;
    try { if (typeof anim.setLooping === 'function') anim.setLooping(on); else anim.loop = on; } catch(_){ anim.loop = on; }
    if (!on && anim.isPaused) { try { anim.goToAndStop(0, true); } catch(_ ){} }
  });

  /* [ANCHOR:FULLSCREEN_API] мобильная кнопка «Развернуть» */
  async function enterFullscreen() {
    var el = document.documentElement;
    try {
      if (el.requestFullscreen)       await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); // iOS Safari
    } catch(_) { /* ignore */ }

    fullH = true;
    applyScale();

    // попытка скрыть адресную строку
    setTimeout(function(){ window.scrollTo(0, 1); }, 300);
    setTimeout(function(){ window.scrollTo(0, 0); }, 600);

    if (screen.orientation && screen.orientation.lock) {
      try { await screen.orientation.lock('portrait'); } catch(_) {}
    }
  }
  fsBtn && fsBtn.addEventListener('click', enterFullscreen);

  /* [ANCHOR:SHARE_ACTION] — Netlify Blobs (если используешь) */
  if (shareBtn){
    shareBtn.addEventListener('click', async function(){
      if (!lastLottieJSON){ alert('Загрузи Lottie перед шарингом.'); return; }
      try {
        var payload = {
          v:1,
          lot: lastLottieJSON,
          bg:  bgDataUrl || null,
          opts: { loop: !!(loopChk && loopChk.checked), wide: !!wide, fullH: !!fullH }
        };
        var resp = await fetch('/api/share', {
          method:'POST',
          headers:{ 'content-type':'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('share failed');
        var data = await resp.json();
        var link = location.origin + location.pathname + '?id=' + encodeURIComponent(data.id);
        try { await navigator.clipboard.writeText(link); } catch(_){}
        alert('Ссылка скопирована:\n' + link);
      } catch(err) {
        console.error(err);
        alert('Не удалось создать шаринг.');
      }
    });
  }

  /* [ANCHOR:LOAD_FROM_LINK] — загрузка по короткой ссылке */
  (async function loadIfLinked(){
    var id = new URLSearchParams(location.search).get('id');
    if (!id) return;
    try {
      var resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
      if (!resp.ok) throw new Error('404');
      var snap = await resp.json();

      if (snap.opts){ wide = !!snap.opts.wide; fullH = !!snap.opts.fullH; if (loopChk) loopChk.checked = !!snap.opts.loop; }
      applyScale();

      if (snap.bg) { bgDataUrl = snap.bg; bgEl.style.backgroundImage = 'url(' + bgDataUrl + ')'; }
      if (snap.lot){ lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
    } catch(e){
      console.error(e);
      alert('Не удалось загрузить данные по ссылке.');
    }
  })();

  /* [ANCHOR:CLEANUP] */
  window.addEventListener('unload', function(){ /* no-op */ });
});
