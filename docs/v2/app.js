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
      applyTheme(t);
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

  // ---------- CYCLING LIST ----------
  document.querySelectorAll('[data-cycle]').forEach(function (list) {
    var items = list.querySelectorAll('li');
    var i = 0;
    function show() { items.forEach(function (li, j) { li.classList.toggle('on', j === i); }); }
    show();
    if (reduce || items.length < 2) return;
    setInterval(function () { i = (i + 1) % items.length; show(); }, 1700);
  });

  // ---------- BOOKSHELF ----------
  var shelf = document.querySelector('[data-shelf]');
  if (shelf) {
    var books = Array.prototype.slice.call(shelf.querySelectorAll('.book'));
    var sheet = shelf.querySelector('.book-sheet');
    var cover = sheet.querySelector('.book-cover');
    var title = sheet.querySelector('h3');
    var forLine = sheet.querySelector('.for');
    var text = sheet.querySelector('.book-info p');
    var count = sheet.querySelector('.count');
    var current = -1;
    function open(i) {
      current = (i + books.length) % books.length;
      var b = books[current];
      cover.style.setProperty('--bg', b.style.getPropertyValue('--bg'));
      cover.style.setProperty('--fg', b.style.getPropertyValue('--fg'));
      cover.textContent = b.dataset.cover || b.dataset.title;
      title.textContent = b.dataset.title;
      forLine.textContent = b.dataset.for;
      text.textContent = b.dataset.text;
      count.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(books.length).padStart(2, '0');
      shelf.classList.add('is-open');
      sheet.removeAttribute('inert');
      sheet.setAttribute('aria-hidden', 'false');
    }
    function close() {
      shelf.classList.remove('is-open');
      sheet.setAttribute('inert', '');
      sheet.setAttribute('aria-hidden', 'true');
      if (current >= 0) books[current].focus({ preventScroll: true });
    }
    books.forEach(function (b, i) {
      b.addEventListener('click', function (e) { e.stopPropagation(); open(i); });
    });
    sheet.querySelector('.close').addEventListener('click', function (e) { e.stopPropagation(); close(); });
    sheet.querySelector('[data-prev]').addEventListener('click', function (e) { e.stopPropagation(); open(current - 1); });
    sheet.querySelector('[data-next]').addEventListener('click', function (e) { e.stopPropagation(); open(current + 1); });
    shelf.addEventListener('click', function (e) {
      if (!shelf.classList.contains('is-open') && !e.target.closest('.book')) open(0);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && shelf.classList.contains('is-open')) close();
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
      var open = document.querySelector('details[open]');
      if (open && open.contains(document.activeElement)) { open.open = false; return; }
      window.location.href = home;
    });
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
