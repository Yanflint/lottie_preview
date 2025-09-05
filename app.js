'use strict';

/* [ANCHOR:VERSION_CONST] */
const VERSION = 'v47-height-from-image_placeholder_heightBtn-actual';

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

  var lottieLayer     = preview.querySelector('.lottie-layer');
  var lottieContainer = document.getElementById('lottie');

  /* [ANCHOR:STATE] */
  var anim = null, animName = null;
  var wide = false;         // 360 / 1000 (десктоп)
  var fullH = false;        // высота = экран (десктоп)
  var lastLottieJSON = null;
  var MOBILE = isMobile();
  var loopOn = false;

  // натуральные размеры фонового изображения
  var bgNatW = 0, bgNatH = 800;  // по умолчанию 800 для плейсхолдера

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

  // актуальная «базовая» высота превью = высота загруженного фона (или 800 до загрузки)
  function basePreviewHeight(){ return Math.max(1, bgNatH || 800); }
  // актуальная «базовая» ширина превью (десктоп): 360 или 1000
  function basePreviewWidth(){ return wide ? 1000 : 360; }

  /* [ANCHOR:ANTICACHE] */
  try { if (typeof lottie.setCacheEnabled === 'function') lottie.setCacheEnabled(false); } catch(_){}

  /* ===================== ДЕСKTOP ===================== */

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

  /* [ANCHOR:DESKTOP_SCALE]
     НЕ fullH:  width = 360/1000, height = высота загруженной картинки (bgNatH).
     fullH:     высота вычисляется из окна с вычетом контролов; ширина пропорционально скейлится.
     Кнопки показывают актуальные пиксели (и ширину, и высоту).
  */
  function applyDesktopScale(){
    if (MOBILE) return;

    var baseW = basePreviewWidth();
    var baseH = basePreviewHeight();

    var SAFE  = 8, GAP = 8;
    var winH  = window.innerHeight || baseH;

    var targetH, targetW;

    if (fullH) {
      var hCtrls = getControlsHeight();
      var hChrome = getAppChromeHeight();
      targetH = Math.max(80, winH - (SAFE*2 + hCtrls + hChrome + GAP));
      // сохраняем пропорции превью относительно «логической» коробки baseW×baseH
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

    // подписи кнопок — всегда фактические пиксели
    if (sizeBtn)   sizeBtn.textContent   = 'Ширина: ' + targetW + 'px';
    if (heightBtn) heightBtn.textContent = 'Высота: ' + targetH + 'px';
  }

  if (!MOBILE) {
    sizeBtn && sizeBtn.addEventListener('click', ()=>{ wide=!wide; applyDesktopScale(); });
    heightBtn && heightBtn.addEventListener('click',()=>{ fullH=!fullH; applyDesktopScale(); });
    window.addEventListener('resize',  ()=>{ if (fullH) applyDesktopScale(); });
  }

  /* ===================== MOBILE ===================== */

  /* [ANCHOR:MOBILE_PREVIEW_SCALE]
     Коробочка превью на мобиле имеет размер 360×(высота картинки).
     Масштабируем по ширине экрана: s = viewportWidth / 360.
  */
  function updateMobilePreviewScale(){
    if (!MOBILE) return;
    const vw = (window.visualViewport && window.visualViewport.width)  ? window.visualViewport.width  : window.innerWidth;
    const s  = vw / 360;

    // базовая высота = bgNatH (или 800 до загрузки)
    preview.style.width  = '360px';
    preview.style.height = basePreviewHeight() + 'px';
    preview.style.transform = `translate(-50%, -50%) scale(${s})`;
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

  /* ===================== ЗАГРУЗКИ ===================== */

  // [ANCHOR:BG_UPLOAD]
  bgInput && bgInput.addEventListener('change', function(e){
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(){
      const src = String(reader.result);
      // считываем натуральные размеры, чтобы поставить правильную высоту превью
      const img = new Image();
      img.onload = function(){
        bgNatW = img.naturalWidth  || img.width  || 0;
        bgNatH = img.naturalHeight || img.height || 0;
        bgImg.src = src;
        phEl && phEl.classList.add('hidden'); // прячем плейсхолдер
        if (MOBILE) updateMobilePreviewScale(); else applyDesktopScale();
      };
      img.src = src;
      try { e.target.value=''; } catch(_){}
    };
    reader.readAsDataURL(file);
  });

  /* [ANCHOR:LOTTIE_LOAD] */
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

    // «по высоте контейнера», кроп по ширине, центр
    const preserve = 'xMidYMid slice';
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
        try {
          const svg = lottieContainer.querySelector('svg');
          const canvas = lottieContainer.querySelector('canvas');
          if (svg) {
            svg.removeAttribute('width'); svg.removeAttribute('height');
            svg.style.width='100%'; svg.style.height='100%';
            svg.style.position='static'; svg.style.margin='0 auto';
            svg.setAttribute('preserveAspectRatio','xMidYMid slice');
          }
          if (canvas) {
            canvas.style.width='100%'; canvas.style.height='100%';
            canvas.style.position='static'; canvas.style.margin='0 auto';
          }
        } catch(_){}
        if (MOBILE) updateMobilePreviewScale(); else applyDesktopScale();
      });
    });
  }

  // [ANCHOR:LOTTIE_UPLOAD]
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

  /* [ANCHOR:RESTART_BTN] */
  restartBtn && restartBtn.addEventListener('click', function(){
    if (!anim) return;
    try { anim.stop(); anim.goToAndPlay(0, true); } catch(_){}
  });

  /* [ANCHOR:LOOP_TOGGLE] */
  loopChk && loopChk.addEventListener('change', function(){
    loopOn = !!loopChk.checked;
    if (anim) {
      try { if (typeof anim.setLooping === 'function') anim.setLooping(loopOn); else anim.loop = loopOn; }
      catch(_){ anim.loop = loopOn; }
    }
  });

  /* [ANCHOR:TOAST_API] */
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

  /* [ANCHOR:SHARE] — сохраняем loopOn как раньше */
  if (shareBtn){
    shareBtn.addEventListener('click', async function(){
      if (!lastLottieJSON){ showToastNear(shareBtn, 'Загрузи Lottie'); return; }
      try {
        const payload = {
          v: 1,
          lot: lastLottieJSON,
          bg:  bgImg.src || null,
          opts: { loop: loopOn, wide: !!wide, fullH: !!fullH }
        };
        const resp = await fetch('/api/share', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
        if (!resp.ok) throw new Error('share failed');
        const data = await resp.json();
        const link = location.origin + location.pathname + '?id=' + encodeURIComponent(data.id);

        try { await navigator.clipboard.writeText(link); }
        catch(_){
          const ta = document.createElement('textarea');
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

  /* [ANCHOR:LOAD_FROM_LINK] — восстанавливаем loop + фон/анимацию */
  (async function loadIfLinked(){
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { if (MOBILE) updateMobilePreviewScale(); else applyDesktopScale(); return; }
    try {
      const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
      if (!resp.ok) throw new Error('404');
      const snap = await resp.json();

      if (snap.opts && typeof snap.opts.loop === 'boolean') {
        loopOn = !!snap.opts.loop;
        if (loopChk) loopChk.checked = loopOn;
      }

      if (snap.bg) {
        // загрузим фон и получим его натуральные размеры
        await new Promise(res=>{
          const img = new Image();
          img.onload = function(){
            bgNatW = img.naturalWidth  || img.width  || 0;
            bgNatH = img.naturalHeight || img.height || 0;
            bgImg.src = snap.bg;
            phEl && phEl.classList.add('hidden');
            res();
          };
          img.src = snap.bg;
        });
      }

      if (snap.lot) { lastLottieJSON = snap.lot; loadLottieFromData(snap.lot); }
      else { if (MOBILE) updateMobilePreviewScale(); else applyDesktopScale(); }
    } catch(e){
      console.error(e);
      if (MOBILE) updateMobilePreviewScale(); else applyDesktopScale();
    }
  })();

  // первичный рендер
  if (MOBILE) updateMobilePreviewScale(); else applyDesktopScale();
});
