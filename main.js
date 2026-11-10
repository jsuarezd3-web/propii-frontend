(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header shadow on scroll
  var header = document.querySelector('header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Split hero title into animated words
  document.querySelectorAll('[data-words]').forEach(function (h) {
    var i = 0;
    h.querySelectorAll('.w').forEach(function (part) {
      var cls = part.className.replace('w', '').trim();
      part.outerHTML = part.textContent.split(' ').filter(Boolean).map(function (w) {
        return '<span class="word ' + cls + '" style="animation-delay:' + (0.08 * i++) + 's">' + w + '</span>';
      }).join(' ');
    });
  });

  // Reveal on scroll
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      var fx = e.target.getAttribute('data-fx');
      if (fx && effects[fx]) effects[fx](e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal,.stagger,[data-fx]').forEach(function (el) { io.observe(el); });

  var effects = {
    count: function (el) {
      el.querySelectorAll('[data-to]').forEach(function (n) {
        var to = parseFloat(n.getAttribute('data-to')), dec = (n.getAttribute('data-to').split('.')[1] || '').length;
        var pre = n.getAttribute('data-pre') || '', suf = n.getAttribute('data-suf') || '';
        if (reduce) { n.textContent = pre + to.toFixed(dec) + suf; return; }
        var t0 = null, dur = 1600;
        function step(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1), v = to * (1 - Math.pow(1 - p, 3));
          n.textContent = pre + v.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    },
    donut: function (el) {
      var d = el.querySelector('.donut'), a = parseInt(d.getAttribute('data-a'), 10), cur = 0;
      if (reduce) { d.style.background = 'conic-gradient(var(--blue) 0 ' + a + '%, var(--orange) 0)'; return; }
      var iv = setInterval(function () {
        cur += 2; if (cur >= a) { cur = a; clearInterval(iv); }
        d.style.background = 'conic-gradient(var(--blue) 0 ' + cur + '%, var(--orange) 0 ' + (cur + (100 - a) * cur / a) + '%, var(--blue-soft) 0)';
      }, 16);
    },
    dots: function (el) {
      var dots = el.querySelectorAll('.dots i'), bar = el.querySelector('.progress i'), lbl = el.querySelector('[data-left]'), i = 0;
      function tick() {
        if (i < dots.length) { dots[i].classList.add('on'); i++; if (lbl) lbl.textContent = (dots.length - i) === 0 ? '¡Retiro gratis!' : 'Faltan ' + (dots.length - i); if (bar) bar.style.width = (i / dots.length * 100) + '%'; setTimeout(tick, reduce ? 0 : 160); }
      }
      tick();
    },
    rank: function (el) { el.querySelectorAll('.ln i').forEach(function (b) { b.style.width = b.getAttribute('data-w'); }); }
  };

  // Hero phone: cycle tip amounts
  var amts = document.querySelectorAll('.amts span');
  if (amts.length && !reduce) {
    var vals = [20, 50, 100], idx = 1, tip = document.getElementById('m-tip'), tot = document.getElementById('m-tot');
    setInterval(function () {
      amts[idx].classList.remove('on'); idx = (idx + 1) % amts.length; amts[idx].classList.add('on');
      var v = parseInt(amts[idx].textContent.replace('$', ''), 10) || vals[idx];
      if (tip) tip.textContent = '$' + v.toFixed(2);
      if (tot) tot.textContent = '$' + (v + 3.9).toFixed(2);
    }, 2200);
  }

  // Smooth page transitions on internal links
  document.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|https?:)/.test(href) || a.target === '_blank') return;
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || reduce) return;
      e.preventDefault(); document.body.classList.add('leaving');
      setTimeout(function () { window.location.href = href; }, 220);
    });
  });
  window.addEventListener('pageshow', function () { document.body.classList.remove('leaving'); });

  var EN = (document.documentElement.lang || '').indexOf('en') === 0;
  var T = EN ? {sending:'Sending…',send:'Send',ok:'Thanks! We got your message and will be in touch soon.',err:'Could not send. Email us at <a href="mailto:hola@propii.mx">hola@propii.mx</a>.'}
            : {sending:'Enviando…',send:'Enviar',ok:'¡Gracias! Recibimos tu mensaje y te contactaremos pronto.',err:'No se pudo enviar. Escríbenos a <a href="mailto:hola@propii.mx">hola@propii.mx</a>.'};

  // Contact forms → FormSubmit (llega a hola@propii.mx)
  document.querySelectorAll('.lead-form').forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]'), msg = form.querySelector('.form-msg');
      if (form._honey && form._honey.value) return;
      btn.disabled = true; btn.textContent = T.sending; msg.className = 'form-msg';
      try {
        var res = await fetch('https://formsubmit.co/ajax/hola@propii.mx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok || data.success === 'false' || data.success === false) throw new Error();
        form.reset(); msg.className = 'form-msg ok';
        msg.textContent = T.ok;
      } catch (err) {
        msg.className = 'form-msg err';
        msg.innerHTML = T.err;
      } finally { btn.disabled = false; btn.textContent = T.send; }
    });
  });

  var yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
