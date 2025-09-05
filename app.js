'use strict';

/* [ANCHOR:VERSION_CONST] */
const VERSION = 'v49-always-fit-to-bg-height-enforced';

/* [ANCHOR:BOOT] */
document.addEventListener('DOMContentLoaded', function () {

  /* [ANCHOR:DOM_QUERY] */
  var wrapper   = document.getElementById('wrapper');
  var preview   = document.getElementById('preview');
  var bgImg     = document.getElementById('bgImg');
  var phEl      = document.getElementById('ph');
  var toastEl   = document.getElementById('toast');
  var verEl     = document.getElementById('ver');

  var bgInput   = document.getElementById('bgInput');
  var lotInput  = document.getElementById('lotInput');
  var restartBtn= document.getElementById('restartBtn');
  var loopChk   = document.getElementById('loopChk');
  var sizeBtn   = document.getElementById('sizeBtn');
  var heightBtn = document.getElementById('heightBtn');
  var shareBtn  = document.getElementById('shareBtn');
  var modeEl    = document.getElementById('mode');

  var lottieContainer = document.getElementById('lottie');

  /* [ANCHOR:STATE] */
  var anim = null, animName = null;
  var wide = false;         // 360 / 1000 (десктоп)
  var fullH = false;        // высота = экран (десктоп)
  var lastLottieJSON = null;
  var MOBILE = isMobile();
  var loopOn = false;
  var bgNatW = 0, bgNatH = 800;  // до загрузки — 800, показываем плейсхолдер

  /* [ANCHOR:VERSION_BADGE_SET] */
  if (verEl) verEl.textContent = VERSION;

  /* [ANCHOR:UTILS] */
  function uid(p){ return (p||'id_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2); }
  function afterTwoFrames(cb){ requestAnimationFrame(()=>requestAnimationFrame(cb)); }
  function isMobile(){
    var ua = navigator.userAgent || '';
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var touch  = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    var small  = Math.min(screen.width, screen.height) <= 820 || window.innerWidth <= 920;
    var uaMob  = /iPhone|Android|Mobile|iPod|IEMobile|Windows Phone/i.test(ua);
    return (coarse || touch || uaMob) && small;
  }
  if (MOBILE) document.body.classList.add('is-mobile');

  // базовые размеры «коробочки» превью
  function basePreviewHeight(){ return Math.max(1, bgNatH || 800); }
  function basePreviewWidth(){ return wide ? 1000 : 360; }

  /* [ANCHOR:ANTICACHE] */
  try { if (typeof lottie.setCacheEnabled === 'function') lottie.setCacheEnabled(false); } catch(_){}

  /* ========= КЛЮЧ: принудительная подгонка Lottie по ВЫСОТЕ ========= */
  function enforceLottieFitByHeight(){
    try{
      var svg = lottieContainer.querySelector('svg');
      var canvas = lottieContainer.querySelector('canvas');
      if (svg){
        svg.removeAttribute('width'); svg.removeAttribute('height');
        svg.style.setProperty('height','100%','important');
        svg.style.setProperty('width','auto','important');
        svg.style.position='static'; svg.style.margin='0 auto';
        svg.setAttribute('preserveAspectRatio','xMidYMid meet'); // масштаб от высоты
      }
      if (canvas){
        canvas.style.setProperty('height','100%','important');
        canvas.style.setProperty('width','auto','important');
        canvas.style.position='static'; canvas.style.margin='0 auto';
      }
    }catch(_){}
  }

  /* ===================== Д Е С К Т О П ===================== */

  function getAppChromeHeight(){
    var app = document.querySelector('.app');
    if (!app) return 0;
    var cs = getComputedStyle(app);
    var padTop = parseFloat(cs.paddingTop) || 0;
    var padBot = parseFloat(cs.paddingBottom) || 0;
    var gap    = parseFloat(cs.rowGap || cs.gap) || 0;
    return Math.ceil(padTop + padBot + gap);
  }
  function getControlsHeight(){
    if (!modeEl) return 0;
    var r = modeEl.getBoundingClientRect();
    return Math.ceil(r.height);
  }

  function applyDesktopScale(){
    if (MOBILE) return;

    var baseW = basePreviewWidth();
    var baseH = basePreviewHeight();

    var SAFE  = 8, GAP = 8;
    var winH  = window.innerHeight || baseH;

    var targetH, targetW;
    if (fullH) {
      var hCtrls  = getControlsHeight();
      var hChrome = getAppChromeHeight();
      targetH = Math.max(80, winH - (SAFE*2 + hCtrls + hChrome + GAP));
      targetW = Math.round(baseW * (targetH / baseH));
    } else {
      targetW = baseW;
      targetH = baseH;
    }

    wrapper.style.width  = targetW + 'px';
    wrapper.style.height = targetH + 'px';

    preview.style.left = '0'; preview.style.top = '0';
    preview.style.width  = '100%';
    preview.style.height = '100%';
    preview.style.transform = 'none';

    if (sizeBtn)   sizeBtn.textContent   = 'Ширина: ' + targetW + 'px';
    if (heightBtn) heightBtn.textContent = 'Высота: ' + targetH + 'px';

    // КРИТИЧНО: после любого пересчёта размеров принудительно фиксируем Lottie по высоте
    enforceLottieFitByHeight();
  }

  if (!MOBILE) {
    sizeBtn && sizeBtn.addEventListener('click', ()=>{ wide=!wide; applyDesktopScale(); });
    heightBtn && heightBtn.addEventListener('click',()=>{ fullH=!fullH; applyDesktopScale(); });
    window.addEventListener('resize', ()=>{ if (fullH) applyDesktopScale(); else enforceLottieFitByHeight(); });
  }

  /* ===================== М О Б И Л Ь Н Ы Й ===================== */

  function updateMobilePreviewScale(){
    if (!MOBILE) return;
    const vw = (window.visualViewport && window.visualViewport.width)  ? window.visualViewport.width  : window.innerWidth;
    const s  = vw / 360;

    preview.style.width  = '360px';
    preview.style.height = basePreviewHeight() + 'px';
    preview.style.transform = `translate(-50%, -50%) scale(${s})`;

    enforceLottieFitByHeight();
  }

  if (MOBILE) {
    updateMobilePreviewScale();
    window.visualViewport && window.visualViewport.addEventListener('resize', updateMobilePreviewScale);
    window.addEventListener('resize', updateMobilePreviewScale);

    // тап по превью = повтор
    wrapper.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('.mode')) return;
      if (!anim) return;
      try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
    });
  }

  /* ===================== З А Г Р У З К И ===================== */

  // Фон: читаем натуральную высоту → это и есть высота превью
  bgInput && bgInput.addEventListener('change', function(e){
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(){
      const src = String(reader.result);
      const meta = new Image();
      meta.onload = function(){
        bgNatW = meta.naturalWidth  || meta.width  || 0;
        bgNatH = meta.naturalHeight || meta.height || 0;
        bgImg.src = src;
        phEl && phEl.classList.add('hidden');
        MOBILE ? updateMobilePreviewScale() : applyDesktopScale();
      };
      meta.src = src;
      try { e.target.value=''; } catch(_){}
    };
    reader.readAsDataURL(file);
  });

  function renewLottieRoot(){
    try { if (anim && animName && typeof lottie.destroy === 'function') lottie.destroy(animName); } catch(_){}
    try { if (anim && anim.destroy) anim.destroy(); } catch(_){}
    anim = null; animName = null;
    while (lottieContainer.firstChild) lottieContainer.removeChild(lottieContainer.firstChild);
  }

  function loadLottieFromData(animationData){
    renewLottieRoot();
    animName = uid('anim_');
    lastLottieJSON = animationData;

    const preserve = 'xMidYMid meet'; // масштаб рассчитываем от высоты
    afterTwoFrames(function(){
      anim = lottie.loadAnimation({
        name: animName,
        container: lottieContainer,
        renderer: 'svg',
        loop: loopOn,
        autoplay: true,
        animationData: JSON.parse(JSON.stringify(animationData)),
        rendererSettings: { progressiveLoad:false, className:'lot-'+animName, preserveAspectRatio: preserve }
      });

      anim.addEventListener('DOMLoaded', function(){
        enforceLottieFitByHeight();                  // сразу после инициализации
        MOBILE ? updateMobilePreviewScale() : applyDesktopScale();
      });
    });
  }

  lotInput && lotInput.addEventListener('change', function(e){
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(){
      try { loadLottieFromData(JSON.parse(String(reader.result))); }
      catch(err){ alert('Не удалось прочитать JSON Lottie.'); }
      try { e.target.value=''; } catch(_){}
    };
    reader.readAsText(file, 'utf-8');
  });

  restartBtn && restartBtn.addEventListener('click', function(){
    if (!anim) return;
    try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
  });

  loopChk && loopChk.addEventListener('change', function(){
    loopOn = !!loopChk.checked;
    if (anim) {
      try { if (typeof anim.setLooping === 'function') anim.setLooping(loopOn); else anim.loop = loopOn; }
      catch(_){ anim.loop = loopOn; }
    }
  });

  function showToastNear(el, msg){
    if (!toastEl) return;
    toastEl.textContent = msg;
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (r) { toastEl.style.left = (r.left + r.width/2) + 'px'; toastEl.style.top  = (r.top) + 'px'; }
    else   { toastEl.style.left = '50%'; toastEl.style.top  = (window.innerHeight - 24) + 'px'; }
    toastEl.classList.add('show');
    clearTimeout(showToastNear._t);
    showToastNear._t = setTimeout(()=> toastEl.classList.remove('show'), 1400);
  }

  if (shareBtn){
    shareBtn.addEventListener('click', async function(){
      if (!lastLottieJSON){ showToastNear(shareBtn, 'Загрузи Lottie'); return; }
      try {
        const payload = { v:1, lot:lastLottieJSON, bg:bgImg.src || null, opts:{ loop:loopOn, wide:!!wide, fullH:!!fullH } };
        const resp = await fetch('/api/share', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
        if (!resp.ok) throw new Error('share failed');
        const data = await resp.json();
        const link = location.origin + location.pathname + '?id=' + encodeURIComponent(data.id);

        try { await navigator.clipboard.writeText(link); }
        catch(_){
          const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta);
          ta.style.position='fixed'; ta.style.left='-9999px'; ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        }
        showToastNear(shareBtn, 'Ссылка скопирована');
      } catch(err) {
        console.error(err); showToastNear(shareBtn, 'Ошибка при шаринге');
      }
    });
  }

  (async function loadIfLinked(){
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { MOBILE ? updateMobilePreviewScale() : applyDesktopScale(); return; }
    try {
      const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
      if (!resp.ok) throw new Error('404');
      const snap = await resp.json();

      if (snap.opts && typeof snap.opts.loop === 'boolean') {
        loopOn = !!snap.opts.loop;
        if (loopChk) loopChk.checked = loopOn;
      }

      if (snap.bg) {
        await new Promise(res=>{
          const meta = new Image();
          meta.onload = function(){
            bgNatW = meta.naturalWidth  || meta.width  || 0;
            bgNatH = meta.naturalHeight || meta.height || 0;
            bgImg.src = snap.bg;
            phEl && phEl.classList.add('hidden');
            res();
          };
          meta.src = snap.bg;
        });
      }

      if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
      else { MOBILE ? updateMobilePreviewScale() : applyDesktopScale(); }
    } catch(e){
      console.error(e);
      MOBILE ? updateMobilePreviewScale() : applyDesktopScale();
    }
  })();

  // первичный рендер
  MOBILE ? updateMobilePreviewScale() : applyDesktopScale();
});
