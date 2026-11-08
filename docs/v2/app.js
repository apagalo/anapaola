// V2: theme, reveal, prints, cycling list, bookshelf, sliders, esc to home, card hover
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- THEME ----------
  var group = document.querySelector('[data-theme-toggle]');
  function applyTheme(t) {
    if (t === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    if (!group) return;
    group.style.setProperty('--i', t === 'dark' ? 1 : 0);
    group.querySelectorAll('[role="radio"]').forEach(function (b) {
      var on = b.getAttribute('data-value') === t;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
  }
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  if (group) {
    group.addEventListener('click', function (e) {
      var b = e.target.closest('[role="radio"]');
      if (!b) return;
      var t = b.getAttribute('data-value');
      var now = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      if (t === now) return;
      // soft cross-fade between themes where the browser can do it
      if (document.startViewTransition && !reduce) {
        root.classList.add('theme-fade');
        var vt = document.startViewTransition(function () { applyTheme(t); });
        vt.finished.finally(function () { root.classList.remove('theme-fade'); });
      } else {
        applyTheme(t);
      }
      try { localStorage.setItem('theme', t); } catch (err) {}
    });
  }

  // ---------- REVEAL ----------
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduce) {
    els.forEach(function (el) { el.classList.add('visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.06 });
    els.forEach(function (el) { io.observe(el); });
  }

  // ---------- STACKED PRINTS ----------
  var printsTile = document.querySelector('[data-prints]');
  if (printsTile) {
    var prints = Array.prototype.slice.call(printsTile.querySelectorAll('.print'));
    var order = prints.map(function (_, i) { return i; });
    var busy = false;
    // a loose, uneven pile: each layer sits at its own angle
    var PILE = ['rotate(-2deg)', 'translate(12px,-6px) rotate(4deg)', 'translate(-10px,-8px) rotate(-6deg)', 'translate(0,-10px) rotate(2deg) scale(.96)'];
    function layout() {
      order.forEach(function (idx, pos) {
        var p = prints[idx];
        p.style.zIndex = String(prints.length - pos);
        p.style.opacity = pos > 2 ? '0' : '1';
        p.style.transform = PILE[Math.min(pos, 3)];
        p.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
      });
    }
    function next() {
      if (busy) return;
      busy = true;
      var top = prints[order[0]];
      top.style.transform = 'translate(-70%, 10%) rotate(-16deg)';
      top.style.opacity = '0';
      setTimeout(function () {
        order.push(order.shift());
        layout();
        busy = false;
      }, reduce ? 0 : 320);
    }
    layout();
    printsTile.addEventListener('click', next);
  }

  // ---------- CYCLING LIST (hover pauses on the item under the pointer) ----------
  document.querySelectorAll('[data-cycle]').forEach(function (list) {
    var items = Array.prototype.slice.call(list.querySelectorAll('li'));
    var i = 0, timer = null, held = false;
    function show() { items.forEach(function (li, j) { li.classList.toggle('on', j === i); }); }
    function stop() { clearInterval(timer); timer = null; }
    function start() {
      stop();
      if (reduce || items.length < 2) return;
      timer = setInterval(function () {
        if (held || list.closest('.is-open')) return;
        i = (i + 1) % items.length; show();
      }, 1700);
    }
    list._go = function (j) { i = j; show(); };
    items.forEach(function (li, j) {
      li.addEventListener('pointerenter', function () { held = true; i = j; show(); });
      li.addEventListener('focusin', function () { held = true; i = j; show(); });
    });
    list.addEventListener('pointerleave', function () { held = false; start(); });
    list.addEventListener('focusout', function (e) { if (!list.contains(e.relatedTarget)) { held = false; start(); } });
    show(); start();
  });

  // ---------- SHEETS: a card that slides over a tile (Toolkit books, How I think steps) ----------
  function sheetTile(tile, triggers, fill) {
    var sheet = tile.querySelector('.book-sheet');
    var count = sheet.querySelector('.count');
    var current = -1, back = null;
    var phone = matchMedia('(max-width: 520px)');
    // on phones the sheet leaves the tile and covers the whole screen
    function goFull() {
      if (sheet.parentNode === document.body) return;
      sheet.style.setProperty('--tile-bg', getComputedStyle(tile).getPropertyValue('--tile-bg'));
      document.body.appendChild(sheet);
      sheet.classList.add('is-full');
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      void sheet.offsetWidth;
      sheet.classList.add('is-shown');
    }
    function leaveFull() {
      if (sheet.parentNode !== document.body) return;
      sheet.classList.remove('is-shown');
      clearTimeout(back);
      back = setTimeout(function () {
        sheet.classList.remove('is-full');
        sheet.removeAttribute('role'); sheet.removeAttribute('aria-modal');
        sheet.style.removeProperty('--tile-bg');
        tile.appendChild(sheet);
      }, reduce ? 0 : 320);
    }
    function open(i) {
      current = (i + triggers.length) % triggers.length;
      fill(triggers[current], current);
      count.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(triggers.length).padStart(2, '0');
      clearTimeout(back);
      tile.classList.add('is-open');
      sheet.removeAttribute('inert');
      sheet.setAttribute('aria-hidden', 'false');
      if (phone.matches) { goFull(); sheet.querySelector('.close').focus({ preventScroll: true }); }
    }
    function close() {
      tile.classList.remove('is-open');
      sheet.setAttribute('inert', '');
      sheet.setAttribute('aria-hidden', 'true');
      leaveFull();
      if (current >= 0) triggers[current].focus({ preventScroll: true });
    }
    triggers.forEach(function (b, i) {
      b.addEventListener('click', function (e) { e.stopPropagation(); open(i); });
    });
    sheet.querySelector('.close').addEventListener('click', function (e) { e.stopPropagation(); close(); });
    sheet.querySelector('[data-prev]').addEventListener('click', function (e) { e.stopPropagation(); open(current - 1); });
    sheet.querySelector('[data-next]').addEventListener('click', function (e) { e.stopPropagation(); open(current + 1); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && tile.classList.contains('is-open')) close();
    });
    return { open: open };
  }

  var shelf = document.querySelector('[data-shelf]');
  if (shelf) {
    var bs = shelf.querySelector('.book-sheet');
    var cover = bs.querySelector('.book-cover');
    var shelfSheet = sheetTile(shelf, Array.prototype.slice.call(shelf.querySelectorAll('.book')), function (b) {
      cover.style.setProperty('--bg', b.style.getPropertyValue('--bg'));
      cover.style.setProperty('--fg', b.style.getPropertyValue('--fg'));
      cover.textContent = b.dataset.cover || b.dataset.title;
      bs.querySelector('h3').textContent = b.dataset.title;
      bs.querySelector('.for').textContent = b.dataset.for;
      bs.querySelector('.book-info p').textContent = b.dataset.text;
    });
    shelf.addEventListener('click', function (e) {
      if (!shelf.classList.contains('is-open') && !e.target.closest('.book')) shelfSheet.open(0);
    });
  }

  var stepsTile = document.querySelector('[data-steps]');
  if (stepsTile) {
    var ss = stepsTile.querySelector('.book-sheet');
    var cyc = stepsTile.querySelector('[data-cycle]');
    sheetTile(stepsTile, Array.prototype.slice.call(stepsTile.querySelectorAll('.cycle button')), function (b, i) {
      ss.querySelector('.step-num').textContent = String(i + 1).padStart(2, '0');
      ss.querySelector('h3').textContent = b.dataset.title;
      ss.querySelector('.for').textContent = b.dataset.for;
      ss.querySelector('.book-info p').textContent = b.dataset.text;
      if (cyc && cyc._go) cyc._go(i);
    });
  }

  // ---------- SLIDERS ----------
  document.querySelectorAll('[data-slider]').forEach(function (track) {
    var id = track.getAttribute('data-slider');
    var btns = document.querySelectorAll('[data-slide="' + id + '"]');
    function step() {
      var first = track.firstElementChild;
      if (!first) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      btns.forEach(function (b) {
        var dir = +b.getAttribute('data-dir');
        b.disabled = dir < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max;
      });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        track.scrollBy({ left: +b.getAttribute('data-dir') * step(), behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  // ---------- ESC → HOME (inner pages) ----------
  var home = document.body.getAttribute('data-home');
  if (home) {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('dialog[open]')) return;
      var open = document.querySelector('details[open]');
      if (open) { open.open = false; return; }
      window.location.href = home;
    });
  }

  // ---------- MODALS (TL;DR) ----------
  document.querySelectorAll('[data-modal]').forEach(function (btn) {
    var dlg = document.getElementById(btn.getAttribute('data-modal'));
    if (!dlg || typeof dlg.showModal !== 'function') return;
    btn.addEventListener('click', function () { dlg.showModal(); });
    dlg.querySelector('[data-close]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  });

  // ---------- CASE SWITCHER: close on outside click ----------
  var sw = document.querySelector('.case-switch');
  if (sw) {
    document.addEventListener('click', function (e) { if (sw.open && !sw.contains(e.target)) sw.open = false; });
  }

  // ---------- HEADER: follows the scroll pixel by pixel, then settles ----------
  var bar = document.querySelector('.crumbbar');
  if (bar) {
    var lastY = Math.max(0, window.scrollY), off = 0, ticking = false, settle = null;
    function busyBar() {
      return bar.contains(document.activeElement) || document.querySelector('.case-switch[open]') || document.querySelector('dialog[open]');
    }
    function setOff(v, animate) {
      off = v;
      bar.classList.toggle('is-snapping', !!animate);
      bar.style.translate = off ? '0 ' + (-off) + 'px' : '';
      root.style.setProperty('--bar-vis', Math.max(0, bar.offsetHeight - off) + 'px');
    }
    function onScroll() {
      ticking = false;
      var y = Math.max(0, window.scrollY), dy = y - lastY, h = bar.offsetHeight + 2;
      lastY = y;
      if (busyBar() || y <= 0) { setOff(0, off > 0 && y > 0); return; }
      setOff(Math.min(h, Math.max(0, off + dy)), false);
      clearTimeout(settle);
      // when scrolling stops halfway, finish the move in the nearer direction
      settle = setTimeout(function () {
        if (off > 0 && off < h) setOff(off > h / 2 && y > h ? h : 0, true);
      }, 160);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    bar.addEventListener('focusin', function () { setOff(0, true); });
  }

  // ---------- CARD HOVER: pointer position for tilt + spotlight ----------
  document.querySelectorAll('.bento .tile:not(.t-prints)').forEach(function (tile) {
    tile.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = tile.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      tile.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      tile.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      if (root.getAttribute('data-hover') === 'tilt' && !reduce) {
        tile.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
        tile.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
      }
    });
    tile.addEventListener('pointerleave', function () {
      tile.style.setProperty('--rx', '0deg');
      tile.style.setProperty('--ry', '0deg');
    });
  });

  // ---------- DESIGN SETTINGS (temporary picker for the card hover) ----------
  var panel = document.getElementById('tweaks');
  var tweakBtn = document.querySelector('.tweak-btn');
  if (panel && tweakBtn) {
    var chips = panel.querySelector('[data-tweak="hover"]');
    function setHover(v, save) {
      root.setAttribute('data-hover', v);
      chips.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); });
      try { save ? localStorage.setItem('v2-hover', v) : localStorage.removeItem('v2-hover'); } catch (err) {}
    }
    function setOpen(on) { panel.hidden = !on; tweakBtn.setAttribute('aria-expanded', on ? 'true' : 'false'); }
    setHover(root.getAttribute('data-hover') || 'lift', !!root.getAttribute('data-hover'));
    tweakBtn.addEventListener('click', function () { setOpen(panel.hidden); });
    chips.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setHover(b.getAttribute('data-v'), true); });
    panel.querySelector('[data-tweak-reset]').addEventListener('click', function () { setHover('lift', false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); tweakBtn.focus(); } });
    document.addEventListener('click', function (e) { if (!panel.hidden && !e.target.closest('.dock')) setOpen(false); });
    if (location.hash === '#settings') setOpen(true);
  }
})();
