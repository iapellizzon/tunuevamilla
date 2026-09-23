/* Tu Nueva Milla — movimiento al scrollear.
   JavaScript puro, sin librerías. Se inicia solo al cargar (TNMMotion.init()).
   Cada animación corre una sola vez. Con prefers-reduced-motion no se anima nada:
   el contenido queda visible y estático (la ruta vertical se ve completa y encendida).

   Marcado:
   - data-reveal="n"  → fade + subida de 16px; n = orden en el escalonado (n × 100 ms)
   - data-draw        → línea que se dibuja de izquierda a derecha
   - .tnm-route       → ruta del hero: la línea se dibuja y los nodos se encienden en secuencia
   - .tnm-bignum__v, [data-count] → números que cuentan desde cero
   - [data-bar="100%"] → barra que arranca en ese ancho y se reduce a su ancho final
   - [data-ticks] con hijos [data-tick] → casilleros que se tildan en secuencia
   - [data-smoke]     → nube de términos que se desvanece y 3 que se "traducen" (ligado al scroll)
   - [data-rail-root] → la página es la ruta: línea vertical con un nodo por sección
   - .nav             → se compacta con blur al scrollear (clase .is-scrolled)
   El HTML siempre tiene el estado FINAL: sin JS o con movimiento reducido, todo se ve completo. */
(function () {
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  var DRAW = 'cubic-bezier(.6,0,.2,1)';
  var DEFAULTS = {
    reveal: '[data-reveal]',
    draw: '[data-draw]',
    route: '.tnm-route',
    routeFill: '.tnm-route__fill',
    routeStop: '.tnm-route__stop',
    routeDot: '.tnm-dot',
    counters: '.tnm-bignum__v, [data-count]',
    nav: '.nav',
    dur: 600,        // fade + subida
    stagger: 100,    // entre elementos escalonados
    drawDur: 700,    // líneas
    countDur: 700    // contadores
  };

  function init(opts) {
    var o = Object.assign({}, DEFAULTS, opts || {});
    var reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var navOff = initNav(o.nav);
    var railOff = initRail(reducedMotion);
    if (reducedMotion) return { destroy: function () { navOff(); railOff(); } };

    var seen = new WeakSet();
    var pending = new Map(); // elemento → callback al entrar en pantalla
    var timers = [];
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    // al destruir, todo vuelve a su estado final
    var finishers = [];
    var fin = function (f) { finishers.push(f); };

    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) fire(e.target); });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }) : null;

    function fire(el) {
      var cb = pending.get(el);
      if (!cb) return;
      pending.delete(el);
      if (io) io.unobserve(el);
      cb(el);
    }
    function onEnter(el, cb) { pending.set(el, cb); if (io) io.observe(el); }
    // respaldo por si IntersectionObserver no dispara
    function check() {
      var h = innerHeight * 0.92;
      pending.forEach(function (_, el) {
        var r = el.getBoundingClientRect();
        if (r.top < h) fire(el); // en pantalla o ya pasado
      });
    }
    addEventListener('scroll', check, { passive: true });

    function belowFold(el) { return el.getBoundingClientRect().top > innerHeight * 0.92; }

    // 1 · Fade + subida escalonada (solo lo que arranca fuera de pantalla)
    function setupReveal(el) {
      if (seen.has(el)) return; seen.add(el);
      if (!belowFold(el)) return;
      var delay = (Number(el.getAttribute('data-reveal')) || 0) * o.stagger;
      var orig = el.style.transition;
      fin(function () { el.style.transition = orig; el.style.translate = ''; el.style.opacity = ''; });
      el.style.opacity = '0';
      el.style.translate = '0 16px';
      el.style.transition = 'opacity ' + o.dur + 'ms ' + EASE + ' ' + delay + 'ms, translate ' + o.dur + 'ms ' + EASE + ' ' + delay + 'ms';
      onEnter(el, function () {
        el.style.opacity = '1';
        el.style.translate = '0 0';
        later(function () { el.style.transition = orig; el.style.translate = ''; el.style.opacity = ''; }, o.dur + delay + 50);
      });
    }

    // 2 · Líneas que se dibujan
    function setupDraw(el) {
      if (seen.has(el)) return; seen.add(el);
      if (!belowFold(el)) return;
      var ot = el.style.transform, otr = el.style.transition;
      fin(function () { el.style.transform = ot; el.style.transition = otr; });
      el.style.transformOrigin = 'left center';
      el.style.transform = 'scaleX(0)';
      onEnter(el, function () {
        el.getBoundingClientRect();
        el.style.transition = 'transform ' + o.drawDur + 'ms ' + DRAW;
        el.style.transform = 'scaleX(1)';
      });
    }

    // 3 · Ruta del hero: línea + nodos que se encienden en secuencia
    function setupRoute(route) {
      if (seen.has(route)) return;
      var stops = Array.prototype.slice.call(route.querySelectorAll(o.routeStop));
      if (!stops.length) return;
      seen.add(route);
      var fill = route.querySelector(o.routeFill);
      if (fill) {
        fill.style.transformOrigin = 'left center';
        fill.style.transform = 'scaleX(0)';
      }
      var items = stops.map(function (s) {
        var dot = s.querySelector(o.routeDot);
        var color = dot ? getComputedStyle(dot).borderTopColor : '';
        var rest = Array.prototype.filter.call(s.children, function (c) { return c !== dot; });
        if (dot) {
          dot.style.borderColor = 'var(--border)';
          dot.style.transform = 'scale(.7)';
          dot.style.transition = 'border-color 400ms ' + EASE + ', transform 400ms ' + EASE + ', box-shadow 500ms ' + EASE;
        }
        rest.forEach(function (c) { c.style.opacity = '.35'; c.style.transition = 'opacity 400ms ' + EASE; });
        return { dot: dot, color: color, rest: rest };
      });
      fin(function () {
        if (fill) { fill.style.transform = ''; fill.style.transition = ''; }
        items.forEach(function (it) {
          if (it.dot) { it.dot.style.borderColor = ''; it.dot.style.transform = ''; it.dot.style.boxShadow = ''; }
          it.rest.forEach(function (c) { c.style.opacity = ''; });
        });
      });
      var at = [60, 360, o.drawDur - 20]; // sincronizado con el avance de la línea
      onEnter(route, function () {
        later(function () {
          if (fill) {
            fill.getBoundingClientRect();
            fill.style.transition = 'transform ' + o.drawDur + 'ms ' + DRAW;
            fill.style.transform = 'scaleX(1)';
          }
          items.forEach(function (it, i) {
            var t = at[i] != null ? at[i] : o.drawDur * i / Math.max(1, items.length - 1);
            later(function () {
              if (it.dot) {
                it.dot.style.borderColor = it.color;
                it.dot.style.transform = 'scale(1)';
                it.dot.style.boxShadow = '0 0 0 7px color-mix(in srgb, ' + it.color + ' 30%, transparent)';
                later(function () { it.dot.style.boxShadow = '0 0 0 4px color-mix(in srgb, ' + it.color + ' 18%, transparent)'; }, 450);
              }
              it.rest.forEach(function (c) { c.style.opacity = '1'; });
            }, t);
          });
        }, 150);
      });
    }

    // 4 · Contadores desde cero (respeta prefijos/sufijos: "87%")
    function setupCounter(el) {
      if (seen.has(el)) return;
      var tn = Array.prototype.find.call(el.childNodes, function (n) { return n.nodeType === 3 && /\d/.test(n.nodeValue); });
      if (!tn) return;
      var m = tn.nodeValue.match(/^(\D*)(\d+)([\s\S]*)$/);
      if (!m) return;
      seen.add(el);
      var pre = m[1], target = parseInt(m[2], 10), post = m[3], final = tn.nodeValue;
      fin(function () { tn.nodeValue = final; el.style.fontVariantNumeric = ''; });
      onEnter(el, function () {
        var t0 = performance.now();
        el.style.fontVariantNumeric = 'tabular-nums';
        tn.nodeValue = pre + '0' + post;
        (function step() {
          var p = Math.min(1, (performance.now() - t0) / o.countDur);
          var e = 1 - Math.pow(1 - p, 3);
          tn.nodeValue = p < 1 ? pre + Math.round(target * e) + post : final;
          if (p < 1) setTimeout(step, 16); else el.style.fontVariantNumeric = '';
        })();
      });
    }

    // 5 · Barra que se reduce hasta su ancho final (el del HTML)
    function setupBar(el) {
      if (seen.has(el)) return; seen.add(el);
      if (!belowFold(el)) return;
      var w = el.style.width, wt = el.style.transition;
      fin(function () { el.style.width = w; el.style.transition = wt; });
      el.style.width = el.getAttribute('data-bar') || '100%';
      onEnter(el, function () {
        later(function () { el.style.transition = 'width ' + o.drawDur + 'ms ' + DRAW; el.style.width = w; }, 250);
      });
    }

    // 6 · Casilleros que se tildan en secuencia
    function setupTicks(box) {
      if (seen.has(box)) return;
      var ticks = Array.prototype.slice.call(box.querySelectorAll('[data-tick]'));
      if (!ticks.length) return;
      seen.add(box);
      if (!belowFold(box)) return;
      var saved = ticks.map(function (t) {
        var mark = t.querySelector('svg');
        var s = { t: t, mark: mark, bc: t.style.borderColor, mo: mark && mark.style.opacity, mt: mark && mark.style.transform };
        t.style.borderColor = 'var(--border)';
        if (mark) { mark.style.opacity = '0'; mark.style.transform = 'scale(.5)'; }
        return s;
      });
      fin(function () {
        saved.forEach(function (s) { s.t.style.borderColor = s.bc; if (s.mark) { s.mark.style.opacity = s.mo; s.mark.style.transform = s.mt; } });
      });
      var step = Math.min(40, 650 / ticks.length);
      onEnter(box, function () {
        saved.forEach(function (s, i) {
          later(function () {
            s.t.style.borderColor = s.bc;
            if (s.mark) { s.mark.style.opacity = s.mo; s.mark.style.transform = s.mt; }
          }, 200 + i * step);
        });
      });
    }

    // 7 · "Del humo a la claridad": ligado al progreso del scroll (reversible).
    //     [data-smoke] contiene [data-smoke-word] (nube que se desvanece; data-optional = se oculta en pantallas angostas)
    //     y [data-smoke-key] (data-x/data-y = posición inicial en la nube, fracción del contenedor) con
    //     [data-smoke-tech] (término técnico), [data-smoke-strike] (tachado), [data-smoke-say] (traducción), [data-smoke-dot].
    function setupSmoke(box) {
      if (seen.has(box)) return; seen.add(box);
      var q$ = function (sel, root) { return Array.prototype.slice.call((root || box).querySelectorAll(sel)); };
      var words = q$('[data-smoke-word]');
      var keys = q$('[data-smoke-key]').map(function (k, i) {
        return { el: k, i: i, x: +k.getAttribute('data-x') || 0, y: +k.getAttribute('data-y') || 0, dx: 0, dy: 0,
          dot: k.querySelector('[data-smoke-dot]'), tech: k.querySelector('[data-smoke-tech]'),
          strike: k.querySelector('[data-smoke-strike]'), say: k.querySelector('[data-smoke-say]') };
      });
      var spine = box.querySelector('[data-smoke-spine]');
      var touched = words.slice();
      keys.forEach(function (k) { touched.push(k.el, k.dot, k.tech, k.strike, k.say); });
      if (spine) touched.push(spine);
      touched = touched.filter(Boolean);
      var origs = touched.map(function (el) { return { el: el, o: el.style.opacity, t: el.style.transform, f: el.style.filter, d: el.style.display, to: el.style.transformOrigin }; });
      var running = false, loopT = null, lastW = 0;
      var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
      var ss = function (a, b, x) { var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
      var blur = function (v) { return v > 0.05 ? 'blur(' + v.toFixed(1) + 'px)' : ''; };

      keys.forEach(function (k) {
        if (k.tech) k.tech.style.transformOrigin = 'left center';
        if (k.strike) k.strike.style.transformOrigin = 'left center';
      });
      if (spine) spine.style.transformOrigin = 'top center';

      function measure() {
        var narrow = box.clientWidth < 520;
        words.forEach(function (w) { if (w.hasAttribute('data-optional')) w.style.display = narrow ? 'none' : ''; });
        var br = box.getBoundingClientRect();
        keys.forEach(function (k) {
          var prev = k.el.style.transform;
          k.el.style.transform = 'none';
          var r = k.el.getBoundingClientRect();
          k.dx = k.x * br.width - (r.left - br.left);
          // que el término visible no se salga del contenedor
          var tw = k.tech ? k.tech.offsetWidth * 1.35 + 32 : 0;
          if (r.left - br.left + k.dx + tw > br.width) k.dx = br.width - tw - (r.left - br.left);
          k.dy = k.y * br.height - (r.top - br.top);
          k.el.style.transform = prev;
        });
        lastW = box.clientWidth;
      }
      function progress() {
        var r = box.getBoundingClientRect(), vh = innerHeight;
        return clamp((vh * 0.88 - r.top) / (vh * 0.55));
      }
      function render(now) {
        var p = progress(), s = now / 1000;
        var fade = 1 - ss(0, 0.45, p);
        words.forEach(function (w, i) {
          w.style.opacity = (0.6 * fade).toFixed(3);
          w.style.filter = blur(2.5 + 5 * (1 - fade));
          w.style.transform = 'translate3d(0,' + (Math.sin(s * 0.8 + i * 1.7) * 6 * fade).toFixed(1) + 'px,0)';
        });
        keys.forEach(function (k) {
          var q = ss(0.2 + k.i * 0.08, 0.75 + k.i * 0.08, p);
          var fl = Math.sin(s * 0.8 + k.i * 2.3) * 6 * (1 - q);
          k.el.style.transform = q >= 1 ? '' : 'translate3d(' + (k.dx * (1 - q)).toFixed(1) + 'px,' + (k.dy * (1 - q) + fl).toFixed(1) + 'px,0)';
          if (k.tech) {
            k.tech.style.opacity = (0.6 + 0.4 * q).toFixed(3);
            k.tech.style.filter = blur(2.5 * (1 - q));
            k.tech.style.transform = 'scale(' + (1.35 - 0.35 * q).toFixed(3) + ')';
          }
          var t2 = ss(0.55, 1, q), t3 = ss(0.6, 1, q);
          if (k.strike) k.strike.style.transform = 'scaleX(' + t2.toFixed(3) + ')';
          if (k.say) {
            k.say.style.opacity = t3.toFixed(3);
            k.say.style.transform = 'translateY(' + (8 * (1 - t3)).toFixed(1) + 'px)';
            k.say.style.filter = blur(3 * (1 - t3));
          }
          if (k.dot) { k.dot.style.opacity = t3.toFixed(3); k.dot.style.transform = 'scale(' + (0.5 + 0.5 * t3).toFixed(3) + ')'; }
        });
        if (spine) spine.style.transform = 'scaleY(' + ss(0.8, 1, p).toFixed(3) + ')';
        return p;
      }
      function loop() {
        if (!running) return;
        var r = box.getBoundingClientRect();
        var p = render(performance.now());
        if (r.bottom < 0 || r.top > innerHeight || p >= 1) { running = false; return; }
        loopT = setTimeout(loop, 33); // ~30 fps alcanza para una flotación suave y cuida la batería
      }
      function kick() { if (!running) { running = true; loop(); } }
      function onResize() { if (box.clientWidth !== lastW) measure(); kick(); }
      measure();
      render(performance.now());
      kick();
      addEventListener('scroll', kick, { passive: true });
      addEventListener('resize', onResize);
      fin(function () {
        running = false; clearTimeout(loopT);
        removeEventListener('scroll', kick); removeEventListener('resize', onResize);
        origs.forEach(function (s) { s.el.style.opacity = s.o; s.el.style.transform = s.t; s.el.style.filter = s.f; s.el.style.display = s.d; s.el.style.transformOrigin = s.to; });
      });
    }

    function each(sel, fn) { document.querySelectorAll(sel).forEach(fn); }
    function queueCheck() { later(check, 0); }

    // la ruta y los contadores se preparan enseguida; el resto espera a que el layout se asiente
    // (estilos + fuentes) antes de decidir qué está fuera de pantalla
    each(o.route, setupRoute);
    each(o.counters, setupCounter);
    queueCheck();
    var settled = false;
    var settle = function () {
      if (settled) return; settled = true;
      each('[data-smoke]', setupSmoke);
      each('[data-bar]', setupBar);
      each('[data-ticks]', setupTicks);
      each(o.reveal, setupReveal);
      each(o.draw, setupDraw);
      queueCheck();
    };
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () { later(settle, 60); });
    later(settle, 800); // por si fonts.ready tarda
    addEventListener('load', check);
    addEventListener('resize', check);
    later(check, 1500);

    return {
      destroy: function () {
        navOff();
        railOff();
        if (io) io.disconnect();
        removeEventListener('scroll', check);
        removeEventListener('load', check);
        removeEventListener('resize', check);
        timers.forEach(clearTimeout);
        finishers.forEach(function (f) { try { f(); } catch (e) {} });
        finishers = [];
      }
    };
  }

  // Nav: se compacta y toma blur apenas se hace scroll (la transición la maneja el CSS).
  function initNav(sel) {
    var nav = document.querySelector(sel);
    if (!nav) return function () {};
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return function () { removeEventListener('scroll', onScroll); nav.classList.remove('is-scrolled'); };
  }

  // La página es la ruta: línea vertical en el margen izquierdo (desktop) que se llena al scrollear,
  // con un nodo por sección que se enciende una sola vez. Corre siempre; con movimiento reducido
  // se muestra completa y encendida.
  //   [data-rail-root] contenedor (position:relative) · [data-rail] línea · [data-rail-fill] relleno
  //   [data-rail-stop] donde va cada nodo · data-rail-color="aqua|blue|violet" · data-rail-label="…" en la parada final
  function initRail(reduced) {
    var root = document.querySelector('[data-rail-root]');
    var rail = root && root.querySelector('[data-rail]');
    var fill = root && root.querySelector('[data-rail-fill]');
    var stops = root ? Array.prototype.slice.call(root.querySelectorAll('[data-rail-stop]')) : [];
    if (!rail || !fill || stops.length < 2) return function () {};
    var AQUA = '#86E0D6', BLUE = '#93B8F0', VIOLET = '#C4A6F2';
    var top = 0, H = 0, reach = 0;
    var nodes = stops.map(function (s) {
      var rc = s.getAttribute('data-rail-color');
      var c = rc === 'aqua' ? AQUA : rc === 'blue' ? BLUE : VIOLET;
      var label = s.getAttribute('data-rail-label');
      var size = label ? 22 : 16;
      var n = document.createElement('div');
      n.setAttribute('aria-hidden', 'true');
      n.style.cssText = 'position:absolute;left:1px;width:' + size + 'px;height:' + size + 'px;margin:-' + size / 2 + 'px 0 0 -' + size / 2 + 'px;border-radius:50%;box-sizing:border-box;border:3px solid color-mix(in srgb, var(--slate-light) 60%, transparent);background:var(--node-fill);transition:border-color 400ms ' + EASE + ',box-shadow 500ms ' + EASE + ',transform 400ms ' + EASE + ',background 400ms ' + EASE;
      // nodos sobre bandas oscuras: toman el tema de la banda (relleno y etiqueta legibles)
      var th = s.closest('[data-theme]');
      if (th && th !== document.documentElement) n.setAttribute('data-theme', th.getAttribute('data-theme'));
      if (label) {
        var l = document.createElement('span');
        l.textContent = label;
        l.style.cssText = 'position:absolute;left:34px;top:50%;transform:translateY(-50%);font-family:var(--font-sans);font-size:var(--fs-km);letter-spacing:var(--ls-km);text-transform:uppercase;font-weight:700;white-space:nowrap;color:var(--text-muted);transition:color 400ms ' + EASE;
        n.appendChild(l);
        n._label = l;
      }
      rail.appendChild(n);
      return { s: s, n: n, c: c, y: 0, lit: false, last: !!label };
    });
    function offY(el) { var y = 0; while (el && el !== root) { y += el.offsetTop; el = el.offsetParent; } return y; }
    function paint(it) {
      var n = it.n;
      n.style.borderColor = it.c;
      if (it.last) { n.style.background = 'linear-gradient(120deg,' + AQUA + ',' + BLUE + ' 55%,' + VIOLET + ')'; if (n._label) n._label.style.color = 'var(--text-accent)'; }
      if (reduced) { n.style.boxShadow = '0 0 0 4px color-mix(in srgb, ' + it.c + ' 18%, transparent)'; return; }
      n.style.transform = 'scale(1.15)';
      n.style.boxShadow = '0 0 0 7px color-mix(in srgb, ' + it.c + ' 30%, transparent)';
      setTimeout(function () { n.style.transform = ''; n.style.boxShadow = '0 0 0 4px color-mix(in srgb, ' + it.c + ' 18%, transparent)'; }, 420);
    }
    function update() {
      if (!H) return;
      var railTop = rail.getBoundingClientRect().top;
      var r = reduced ? H : Math.max(0, Math.min(H, innerHeight * 0.6 - railTop));
      if (r > reach) reach = r; // se llena una sola vez: no retrocede
      fill.style.height = reach + 'px';
      nodes.forEach(function (it) { if (!it.lit && it.y - top <= reach + 1) { it.lit = true; paint(it); } });
    }
    function layout() {
      if (rail.offsetWidth === 0) return; // mobile: la línea está oculta, quedan los puntos junto a cada eyebrow
      nodes.forEach(function (it) { it.y = offY(it.s) + Math.min(10, it.s.offsetHeight / 2); });
      top = nodes[0].y;
      H = Math.max(0, nodes[nodes.length - 1].y - top);
      rail.style.top = top + 'px';
      rail.style.bottom = 'auto';
      rail.style.height = H + 'px';
      fill.style.backgroundSize = '100% ' + H + 'px';
      if (!reduced) fill.style.transition = 'height 150ms linear';
      nodes.forEach(function (it) { it.n.style.top = (it.y - top) + 'px'; });
      update();
    }
    layout();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', layout);
    addEventListener('load', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    // las imágenes con lazy-load cambian alturas: recalcular cuando cambia el tamaño del contenedor
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(root);
    return function () {
      removeEventListener('scroll', update); removeEventListener('resize', layout); removeEventListener('load', layout);
      if (ro) ro.disconnect();
      nodes.forEach(function (it) { it.n.remove(); });
      rail.style.top = ''; rail.style.bottom = ''; rail.style.height = '';
      fill.style.height = ''; fill.style.transition = ''; fill.style.backgroundSize = '';
    };
  }

  window.TNMMotion = { init: init };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.TNMMotion.instance = init(); });
  } else {
    window.TNMMotion.instance = init();
  }
})();
