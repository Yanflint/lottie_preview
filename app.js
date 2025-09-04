/* [ANCHOR:MOBILE_LAYOUT] — подгоняем Lottie по полной высоте фона (даже если фон обрезан) */
function updateMobileFitToBg(){
  if (!MOBILE) return;

  // размеры контейнера-превью (на весь экран по ширине)
  var cw = wrapper.clientWidth;
  var ch = wrapper.clientHeight;

  // Если знаем натуральные размеры фона — считаем высоту фона в масштабе по ширине.
  // Иначе используем высоту контейнера как фолбэк.
  var h;
  if (bgNatW > 0 && bgNatH > 0) {
    var scale = cw / bgNatW;         // фон подогнан по ширине
    h = bgNatH * scale;              // ПОЛНАЯ высота фона (может быть > ch или < ch)
  } else {
    h = ch;                           // нет фона — подогнать под контейнер
  }

  // Центрируем слой Lottie по вертикали относительно контейнера,
  // даже если он выходит за края (wrapper скрывает излишки).
  var top = (ch - h) / 2;

  // Фиксируем геометрию слоя Lottie под фон
  lottieLayer.style.left   = '0';
  lottieLayer.style.right  = '0';
  lottieLayer.style.width  = '100%';       // ширина как у контейнера
  lottieLayer.style.top    = top + 'px';   // может быть отрицательной
  lottieLayer.style.height = h + 'px';
  lottieLayer.style.bottom = 'auto';
}
