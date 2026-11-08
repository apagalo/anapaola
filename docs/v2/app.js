// V2 — theme, reveal, stacked prints, cycling list, bookshelf, letter shortcuts
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
    function layout() {
      order.forEach(function (idx, pos) {
        var p = prints[idx];
        var d = Math.min(pos, 2);
        p.style.zIndex = String(prints.length - pos);
        p.style.opacity = pos > 2 ? '0' : '1';
        p.style.transform = 'translate(' + (d * 7) + 'px,' + (d * -7) + 'px) scale(' + (1 - d * 0.015) + ') rotate(' + (d * 1.2) + 'deg)';
        p.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
      });
    }
    function next() {
      if (busy) return;
      busy = true;
      var top = prints[order[0]];
      top.style.transform = 'translate(-14%, 6%) rotate(-9deg)';
      top.style.opacity = '0';
      setTimeout(function () {
        order.push(order.shift());
        layout();
        busy = false;
      }, reduce ? 0 : 260);
    }
    layout();
    printsTile.addEventListener('click', next);
    printsTile._activate = next;
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
    shelf._activate = function () { shelf.classList.contains('is-open') ? close() : open(0); };
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

  // ---------- LETTER SHORTCUTS ----------
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (!/^[a-z]$/i.test(e.key)) return;
    var tile = document.querySelector('[data-key="' + e.key.toUpperCase() + '"]');
    if (!tile) return;
    e.preventDefault();
    if (tile._activate) { tile.focus({ preventScroll: true }); tile._activate(); }
    else if (tile.href) window.location.href = tile.href;
  });
})();
