'use strict';

/* [ANCHOR:VERSION_CONST] */
const VERSION = 'v31-fit-bg-fullheight';

/* [ANCHOR:BOOT] */
document.addEventListener('DOMContentLoaded', function () {

  /* [ANCHOR:INIT_DOM] */
  var wrapper     = document.getElementById('wrapper');
  var stage       = document.getElementById('stage');
  var bgEl        = document.getElementById('bg');
  var toastEl     = document.getElementById('toast');
  var verEl       = document.getElementById('ver');

  var bgInput     = document.getElementById('bgInput');
  var lotInput    = document.getElementById('lotInput');
  var restartBtn  = document.getElementById('restartBtn');
  var loopChk     = document.getElementById('loopChk');
  var sizeBtn     = document.getElementById('sizeBtn');
  var heightBtn   = document.getElementById('heightBtn');
  var shareBtn    = document.getElementById('shareBtn');

  var lottieLayer     = stage.querySelector('.lottie-layer');
  var lottieContainer = document.getElementById('lottie');

  /* [ANCHOR:STATE] */
  var anim = null, animName = null;
  var wide = false;     // 360 / 1000 (десктоп)
  var fullH = false;    // 800 / экран (десктоп)
  var bgDataUrl = null; // фон как dataURL
  var lastLottieJSON = null;

  // Натуральные размеры фона (для точного вычисления масштабирования по ширине)
  var bgNatW = 0, bgNatH = 0;

  /* [ANCHOR:VERSION_SET] */
  if (verEl) verEl.textContent = VERSION;

  /* [ANCHOR:UTILS] */
  function uid(p){ return (p||'id_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2); }
  function afterTwoFrames(cb){ requestAnimationFrame(function(){ requestAnimationFrame(cb); }); }

  /* [ANCHOR:TOAST_API] — тост рядом с кнопкой */
  function showToastNear(el, msg){
    if (!toastEl) return;
    toastEl.textContent = msg;
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (r) {
      toastEl.style.left = (r.left + r.width/2) + 'px';
      toastEl.style.top  = (r.top) + 'px';
    } else {
      toastEl.style.left = '50%';
      toastEl.style.top  = (window.innerHeight - 24) + 'px';
    }
    toastEl.classList.add('show');
    clearTimeout(showToastNear._t);
    showToastNear._t = setTimeout(()=> toastEl.classList.remove('show'), 1400);
  }

  /* [ANCHOR:MOBILE_DETECT] */
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

  /* [ANCHOR:ANTICACHE] */
  try { if (typeof lottie.setCacheEnabled === 'function') lottie.setCacheEnabled(false); } catch(e){}

  /* [ANCHOR:RESET] */
  function renewLottieRoot(){
    try { if (anim && animName && typeof lottie.destroy === 'function') lottie.destroy(animName); } catch(_){}
    try { if (anim && anim.destroy) anim.destroy(); } catch(_){}
    anim = null; animName = null;

    if (lottieLayer && lottieLayer.parentNode) lottieLayer.parentNode.removeChild(lottieLayer);
    lottieLayer = document.createElement('div');
    lottieLayer.className = 'lottie-layer';
    lottieLayer.style.inset = '0';
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

  /* [ANCHOR:APPLY_SCALE] — десктоп (мобайл управляет CSS/JS ниже) */
  function applyScale(){
    if (MOBILE) return;
    var baseW = wide ? 1000 : 360;
    var baseH = 800;
    var SAFE_BOTTOM = 8;

    var winH    = window.innerHeight || baseH;
    var targetH = fullH ? Math.max(1, winH - SAFE_BOTTOM) : baseH;
    var targetW = fullH ? Math.round(baseW * (targetH / baseH)) : baseW;

    wrapper.style.width  = targetW + 'px';
    wrapper.style.height = targetH + 'px';

    if (sizeBtn)   sizeBtn.textContent   = 'Ширина: ' + targetW + 'px';
    if (heightBtn) heightBtn.textContent = 'Высота: ' + (fullH ? 'экран' : '800');
  }

  if (!MOBILE) {
    sizeBtn && sizeBtn.addEventListener('click',  function(){ wide  = !wide;  applyScale(); });
    heightBtn && heightBtn.addEventListener('click',function(){ fullH = !fullH; applyScale(); });
    window.addEventListener('resize',  function(){ if (fullH) applyScale(); });
  }
  applyScale();

  /* [ANCHOR:MOBILE_BG_META] — читаем натуральные размеры загруженного фона */
  function loadBgMeta(dataUrl){
    return new Promise(function(resolve){
      var img = new Image();
      img.onload = function(){
        bgNatW = img.naturalWidth || img.width || 0;
        bgNatH = img.naturalHeight || img.height || 0;
        resolve();
      };
      img.src = dataUrl;
    });
  }

  /* [ANCHOR:MOBILE_LAYOUT] — Lottie = полная высота фоновой картинки (масштаб по ширине) */
  function updateMobileFitToBg(){
    if (!MOBILE) return;

    var cw = wrapper.clientWidth;
    var ch = wrapper.clientHeight;

    // фон задан как background-size: 100% auto → ширина = cw, высота = cw * (bgNatH/bgNatW)
    var h;
    if (bgNatW > 0 && bgNatH > 0) {
      var scale = cw / bgNatW;
      h = bgNatH * scale;             // ПОЛНАЯ высота фонового изображения в текущем масштабе
    } else {
      h = ch;                          // нет фона — используем высоту контейнера
    }

    var top = (ch - h) / 2;            // центрируем, даже если выйдет за края

    // геометрия слоя Lottie
    lottieLayer.style.left   = '0';
    lottieLayer.style.right  = '0';
    lottieLayer.style.width  = '100%';
    lottieLayer.style.top    = top + 'px';
    lottieLayer.style.height = h + 'px';
    lottieLayer.style.bottom = 'auto';
  }

  /* [ANCHOR:BG_UPLOAD] */
  bgInput && bgInput.addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(){
      bgDataUrl = String(reader.result);
      bgEl.style.backgroundImage = 'url(' + bgDataUrl + ')';
      await loadBgMeta(bgDataUrl);
      updateMobileFitToBg();
      try { e.target.value=''; } catch(_){}
    };
    reader.readAsDataURL(file);
  });

  /* [ANCHOR:LOTTIE_LOAD] */
  function loadLottieFromData(animationData){
    disposeAll();
    animName = uid('anim_');
    lastLottieJSON = animationData;

    var preserve = MOBILE ? 'xMidYMid meet' : 'xMidYMid slice';
    afterTwoFrames(function(){
      anim = lottie.loadAnimation({
        name: animName,
        container: lottieContainer,
        renderer: 'svg',
        loop: !!(loopChk && loopChk.checked),
        autoplay: true,
        animationData: JSON.parse(JSON.stringify(animationData)),
        rendererSettings: { progressiveLoad:false, className:'lot-'+animName, preserveAspectRatio: preserve }
      });

      anim.addEventListener('DOMLoaded', function(){
        try {
          var svg = lottieContainer.querySelector('svg');
          var canvas = lottieContainer.querySelector('canvas');

          if (svg) {
            svg.removeAttribute('width'); svg.removeAttribute('height');
            svg.style.position='static'; svg.style.margin='0 auto';
            svg.style.height='100%'; svg.style.width='auto';
          }
          if (canvas) {
            canvas.style.position='static'; canvas.style.margin='0 auto';
            canvas.style.height='100%'; canvas.style.width='auto';
          }
          // после вставки — подгон по фону
          updateMobileFitToBg();
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

  /* [ANCHOR:RESTART] — кнопка (десктоп) */
  restartBtn && restartBtn.addEventListener('click', function(){
    if (!anim) return;
    try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
  });

  /* [ANCHOR:MOBILE_TAP_RESTART] — тап по превью = повтор (мобайл) */
  if (MOBILE) {
    wrapper.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('.mode')) return;
      if (!anim) return;
      try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
    });
    window.addEventListener('resize', updateMobileFitToBg);
    setTimeout(updateMobileFitToBg, 100);
  }

  /* [ANCHOR:LOOP_TOGGLE] */
  loopChk && loopChk.addEventListener('change', function(){
    if (!anim) return;
    var on = loopChk.checked;
    try { if (typeof anim.setLooping === 'function') anim.setLooping(on); else anim.loop = on; } catch(_){ anim.loop = on; }
    if (!on && anim.isPaused) { try { anim.goToAndStop(0, true); } catch(_ ){} }
  });

  /* [ANCHOR:SHARE_ACTION] — короткая ссылка с «тостом» у кнопки */
  if (shareBtn){
    shareBtn.addEventListener('click', async function(){
      if (!lastLottieJSON){ showToastNear(shareBtn, 'Загрузи Lottie'); return; }
      try {
        var payload = { v:1, lot: lastLottieJSON, bg:  bgDataUrl || null,
          opts: { loop: !!(loopChk && loopChk.checked), wide: !!wide, fullH: !!fullH } };
        var resp = await fetch('/api/share', {
          method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('share failed');
        var data = await resp.json();
        var link = location.origin + location.pathname + '?id=' + encodeURIComponent(data.id);

        try { await navigator.clipboard.writeText(link); }
        catch(_) {
          var ta = document.createElement('textarea');
          ta.value = link; document.body.appendChild(ta);
          ta.style.position='fixed'; ta.style.left='-9999px';
          ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        }
        showToastNear(shareBtn, 'Ссылка скопирована');
      } catch(err) {
        console.error(err);
        showToastNear(shareBtn, 'Ошибка при шаринге');
      }
    });
  }

  /* [ANCHOR:LOAD_FROM_LINK] — инициализация из короткой ссылки (Netlify Blobs) */
  (async function loadIfLinked(){
    var id = new URLSearchParams(location.search).get('id');
    if (!id) { updateMobileFitToBg(); return; }
    try {
      var resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
      if (!resp.ok) throw new Error('404');
      var snap = await resp.json();

      if (snap.opts){ wide = !!snap.opts.wide; fullH = !!snap.opts.fullH; if (loopChk) loopChk.checked = !!snap.opts.loop; }

      if (snap.bg) {
        bgDataUrl = snap.bg;
        bgEl.style.backgroundImage = 'url(' + bgDataUrl + ')';
        await loadBgMeta(bgDataUrl);
      }
      if (snap.lot){ lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }

      updateMobileFitToBg();
    } catch(e){
      console.error(e);
      updateMobileFitToBg();
    }
  })();
});
