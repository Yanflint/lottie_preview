'use strict';

/* [ANCHOR:VERSION_CONST] */
const VERSION = 'v34-preview-by-width_lottie-by-preview-height';

/* [ANCHOR:BOOT] */
document.addEventListener('DOMContentLoaded', function () {

  /* [ANCHOR:DOM_QUERY] */
  var wrapper   = document.getElementById('wrapper');
  var preview   = document.getElementById('preview');
  var bgImg     = document.getElementById('bgImg');
  var toastEl   = document.getElementById('toast');
  var verEl     = document.getElementById('ver');

  var bgInput   = document.getElementById('bgInput');
  var lotInput  = document.getElementById('lotInput');
  var restartBtn= document.getElementById('restartBtn');
  var loopChk   = document.getElementById('loopChk');
  var sizeBtn   = document.getElementById('sizeBtn');
  var heightBtn = document.getElementById('heightBtn');
  var shareBtn  = document.getElementById('shareBtn');

  var lottieLayer     = preview.querySelector('.lottie-layer');
  var lottieContainer = document.getElementById('lottie');

  /* [ANCHOR:STATE] */
  var anim = null, animName = null;
  var wide = false;     // 360 / 1000 (десктоп)
  var fullH = false;    // 800 / экран (десктоп)
  var lastLottieJSON = null;
  var bgNatW = 0, bgNatH = 0; // натуральные размеры фона

  // Базовое соотношение 360×800 для фолбэка, если фона нет
  var FALLBACK_AR_H_OVER_W = 800 / 360;

  /* [ANCHOR:VERSION_BADGE_SET] */
  if (verEl) verEl.textContent = VERSION;

  /* [ANCHOR:UTILS] */
  function uid(p){ return (p||'id_') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2); }
  function afterTwoFrames(cb){ requestAnimationFrame(()=>requestAnimationFrame(cb)); }

  /* [ANCHOR:TOAST_API] — тост над кнопкой */
  function showToastNear(el, msg){
    if (!toastEl) return;
    toastEl.textContent = msg;
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (r) {
      toastEl.style.left = (r.left + r.width/2) + 'px';
      toastEl.style.top  = (r.top) + 'px'; // top кнопки; CSS поднимет тост выше через translate(-100%)
    } else {
      toastEl.style.left = '50%';
      toastEl.style.top  = (window.innerHeight - 24) + 'px';
    }
    toastEl.classList.add('show');
    clearTimeout(showToastNear._t);
    showToastNear._t = setTimeout(()=> toastEl.classList.remove('show'), 1400);
  }

  /* [ANCHOR:MOBILE_DETECT] */
  function isMobile(){
    var ua = navigator.userAgent || '';
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var touch  = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    var small  = Math.min(screen.width, screen.height) <= 820 || window.innerWidth <= 920;
    var uaMob  = /iPhone|Android|Mobile|iPod|IEMobile|Windows Phone/i.test(ua);
    return (coarse || touch || uaMob) && small;
  }
  var MOBILE = isMobile();
  if (MOBILE) document.body.classList.add('is-mobile');

  /* [ANCHOR:ANTICACHE] */
  try { if (typeof lottie.setCacheEnabled === 'function') lottie.setCacheEnabled(false); } catch(_){}

  /* [ANCHOR:DESKTOP_SCALE] — старые режимы ширины/высоты (десктоп) */
  function applyDesktopScale(){
    if (MOBILE) return;
    var baseW = wide ? 1000 : 360;
    var baseH = 800;
    var SAFE_BOTTOM = 8;

    var winH    = window.innerHeight || baseH;
    var targetH = fullH ? Math.max(1, winH - SAFE_BOTTOM) : baseH;
    var targetW = fullH ? Math.round(baseW * (targetH / baseH)) : baseW;

    wrapper.style.width  = targetW + 'px';
    wrapper.style.height = targetH + 'px';

    // preview повторяет wrapper на десктопе
    preview.style.left = '0'; preview.style.right = '0';
    preview.style.width  = '100%';
    preview.style.height = '100%';
    preview.style.top    = '0';

    if (sizeBtn)   sizeBtn.textContent   = 'Ширина: ' + targetW + 'px';
    if (heightBtn) heightBtn.textContent = 'Высота: ' + (fullH ? 'экран' : '800');
  }

  if (!MOBILE) {
    sizeBtn && sizeBtn.addEventListener('click',  ()=>{ wide=!wide; applyDesktopScale(); });
    heightBtn && heightBtn.addEventListener('click',()=>{ fullH=!fullH; applyDesktopScale(); });
    window.addEventListener('resize', ()=>{ if (fullH) applyDesktopScale(); });
  }
  applyDesktopScale();

  /* [ANCHOR:LOAD_BG_META] */
  function loadBgMeta(src){
    return new Promise(resolve=>{
      const img = new Image();
      img.onload = function(){
        bgNatW = img.naturalWidth || img.width  || 0;
        bgNatH = img.naturalHeight|| img.height || 0;
        resolve();
      };
      img.src = src;
    });
  }

  /* [ANCHOR:MOBILE_LAYOUT] — ключевая логика
     1) wrapper = экран;
     2) preview шириной = ширина экрана; высота = width * (bgNatH/bgNatW) (или фолбэк 800/360);
     3) preview вертикально центрируется в wrapper;
     4) Lottie заполняет preview по ВЫСОТЕ, ширина авто (центр по X). */
  function updateMobileLayout(){
    if (!MOBILE) return;

    const cw = wrapper.clientWidth;     // ширина экрана
    const ch = wrapper.clientHeight;    // высота экрана

    const ar = (bgNatW>0 && bgNatH>0) ? (bgNatH/bgNatW) : FALLBACK_AR_H_OVER_W;
    const ph = Math.round(cw * ar);     // высота контейнера превью, по фону
    const top = Math.round((ch - ph)/2);

    // размеры и позиция preview
    preview.style.width  = '100vw';
    preview.style.height = ph + 'px';
    preview.style.left   = '0';
    preview.style.right  = '0';
    preview.style.top    = top + 'px';

    // фон-IMG уже масштабируется CSS-ом: на мобиле width:100%; height:auto;
    // Lottie-слой заполнит preview (inset:0 в CSS). SVG/canvas — height:100%.
  }

  /* [ANCHOR:BG_UPLOAD] */
  bgInput && bgInput.addEventListener('change', function(e){
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(){
      const src = String(reader.result);
      bgImg.src = src;
      await loadBgMeta(src);
      updateMobileLayout();
      try { e.target.value=''; } catch(_){}
    };
    reader.readAsDataURL(file);
  });

  /* [ANCHOR:LOTTIE_LOAD] */
  function renewLottieRoot(){
    try { if (anim && animName && typeof lottie.destroy === 'function') lottie.destroy(animName); } catch(_){}
    try { if (anim && anim.destroy) anim.destroy(); } catch(_){}
    anim = null; animName = null;

    // очистка контейнера
    while (lottieContainer.firstChild) lottieContainer.removeChild(lottieContainer.firstChild);
  }

  function loadLottieFromData(animationData){
    renewLottieRoot();
    animName = uid('anim_');
    lastLottieJSON = animationData;

    const preserve = 'xMidYMid meet'; // чтобы вписываться по высоте без обрезки по ширине
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
          const svg = lottieContainer.querySelector('svg');
          const canvas = lottieContainer.querySelector('canvas');

          if (svg) {
            svg.removeAttribute('width'); svg.removeAttribute('height');
            svg.style.height='100%'; svg.style.width='auto';
            svg.style.position='static'; svg.style.margin='0 auto';
            svg.setAttribute('preserveAspectRatio','xMidYMid meet');
          }
          if (canvas) {
            canvas.style.height='100%'; canvas.style.width='auto';
            canvas.style.position='static'; canvas.style.margin='0 auto';
          }
        } catch(_){}
        // после вставки — обновим геометрию превью для мобайла
        updateMobileLayout();
      });
    });
  }

  /* [ANCHOR:LOTTIE_UPLOAD] */
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
    window.addEventListener('resize', updateMobileLayout);
    setTimeout(updateMobileLayout, 100);
  }

  /* [ANCHOR:LOOP_TOGGLE] */
  loopChk && loopChk.addEventListener('change', function(){
    if (!anim) return;
    const on = loopChk.checked;
    try { if (typeof anim.setLooping === 'function') anim.setLooping(on); else anim.loop = on; } catch(_){ anim.loop = on; }
    if (!on && anim.isPaused) { try { anim.goToAndStop(0, true); } catch(_ ){} }
  });

  /* [ANCHOR:SHARE] — короткая ссылка с тостом НАД кнопкой */
  if (shareBtn){
    shareBtn.addEventListener('click', async function(){
      if (!lastLottieJSON){ showToastNear(shareBtn, 'Загрузи Lottie'); return; }
      try {
        const payload = { v:1, lot:lastLottieJSON, bg: bgImg.src || null,
          opts:{ loop:!!(loopChk && loopChk.checked), wide:!!wide, fullH:!!fullH } };
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

  /* [ANCHOR:LOAD_FROM_LINK] — если открыли короткую ссылку */
  (async function loadIfLinked(){
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { updateMobileLayout(); return; }
    try {
      const resp = await fetch('/api/shot?id=' + encodeURIComponent(id));
      if (!resp.ok) throw new Error('404');
      const snap = await resp.json();

      if (snap.bg) {
        bgImg.src = snap.bg;
        await loadBgMeta(snap.bg);
      }
      if (snap.lot) {
        lastLottieJSON = snap.lot; loadLottieFromData(snap.lot);
      } else {
        updateMobileLayout();
      }
    } catch(e){
      console.error(e);
      updateMobileLayout();
    }
  })();
});
