(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const animated = !reduced && hasGsap;
  if (!animated) root.classList.add('reduced');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Défilement doux
  let lenis = null;
  if (animated && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const nav = $('[data-nav]');

  const scrollToHash = (hash) => {
    const target = hash === '#top' ? 0 : $(hash);
    if (target === null) return;
    const offset = target === 0 ? 0 : -(nav.offsetHeight - 1);
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.3 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: reduced ? 'auto' : 'smooth' });
  };

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      if (hash.length < 2) return;
      e.preventDefault();
      closeMenu();
      scrollToHash(hash);
    });
  });

  // Menu mobile
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  const menuLogo = $('[data-menu-logo]');
  const menuLinks = $$('.menu nav a, .menu__tel');
  const navLogo = $('.nav__brand img');
  let menuTl = null;

  function openMenu() {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    lenis && lenis.stop();
    if (!animated) return;
    menuTl && menuTl.kill();
    menuTl = gsap.timeline()
      .to(navLogo, { opacity: 0, scale: 0.8, duration: 0.25, ease: 'power2.out' }, 0)
      .fromTo(menuLogo, { opacity: 0, scale: 0.7, rotate: -12, y: 20 }, { opacity: 1, scale: 1, rotate: 0, y: 0, duration: 0.8, ease: 'power3.out' }, 0.15)
      .fromTo(menuLinks, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 }, 0.3);
  }

  function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    burger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    lenis && lenis.start();
    if (!animated) { menu.classList.remove('is-open'); return; }
    menuTl && menuTl.kill();
    menuTl = gsap.timeline({ onComplete: () => menu.classList.remove('is-open') })
      .to(menuLinks, { opacity: 0, y: -10, duration: 0.2, ease: 'power2.in', stagger: 0.02 }, 0)
      .to(menuLogo, { opacity: 0, scale: 0.8, rotate: 8, duration: 0.3, ease: 'power2.in' }, 0.05)
      .to(navLogo, { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' }, 0.3);
  }

  burger.addEventListener('click', () => {
    burger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // Navigation et boutons flottants
  const fabs = $$('[data-fab]');
  const bookFab = $('[data-book-fab]');
  let bookingInView = false;
  const onScroll = () => {
    const y = window.scrollY;
    const past = y > window.innerHeight * 0.7;
    nav.classList.toggle('is-solid', y > 24);
    fabs.forEach((f) => f.classList.toggle('is-visible', past));
    bookFab.classList.toggle('is-visible', past && !bookingInView);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  new IntersectionObserver((entries) => {
    bookingInView = entries[0].isIntersecting;
    onScroll();
  }, { threshold: 0.15 }).observe(document.getElementById('reserver'));
  onScroll();

  const navLinks = $$('.nav__links a');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((l) => l.classList.toggle('is-current', l.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['excursions', 'parcours', 'capitaine', 'accessibilite', 'avis'].forEach((id) => { const el = document.getElementById(id); el && io.observe(el); });

  // Texte du capitaine, mot par mot
  const words = $('[data-words]');
  if (words) words.innerHTML = words.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');

  initBooking();
  initSliders();
  initGps();
  initBelle();

  // Parcours
  const route = $('[data-route]');
  const boat = $('[data-boat]');
  const stops = $$('[data-stop]');
  const steps = $$('[data-step]');
  const photos = $$('[data-photos] img');
  const len = route.getTotalLength();
  const stopAt = [0];
  (() => {
    let from = 0;
    stops.slice(1).forEach((st) => {
      const m = st.getAttribute('transform').match(/translate\(([\d.]+) ([\d.]+)\)/);
      const sx = +m[1], sy = +m[2];
      let best = from, bestD = Infinity;
      for (let l = from; l <= len; l += 2) {
        const q = route.getPointAtLength(l);
        const d = (q.x - sx) ** 2 + (q.y - sy) ** 2;
        if (d < bestD) { bestD = d; best = l; }
        if (bestD < 4 && d > 400) break;
      }
      from = best;
      stopAt.push(best / len);
    });
  })();

  const setActive = (idx) => {
    stops.forEach((s, i) => s.classList.toggle('is-active', i <= idx));
    steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    photos.forEach((p, i) => p.classList.toggle('is-active', i === idx));
  };
  const drawRoute = (p) => {
    route.style.strokeDasharray = `${len}`;
    route.style.strokeDashoffset = `${len * (1 - p)}`;
    const pt = route.getPointAtLength(len * p);
    const ahead = route.getPointAtLength(Math.min(len, len * p + 1));
    const angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
    boat.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${angle})`);
    let idx = 0;
    stopAt.forEach((s, i) => { if (p >= s) idx = i; });
    if (p > 0.97) idx = steps.length - 1;
    setActive(idx);
  };

  if (!animated) {
    $$('.w').forEach((w) => w.classList.add('is-on'));
    const loader = $('.loader'); loader && loader.remove();
    drawRoute(1);
    steps.forEach((s) => s.classList.add('is-active'));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  drawRoute(0);

  // Entrée
  const loader = $('.loader');
  gsap.set('[data-hero-in]', { y: 24, opacity: 0 });
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .fromTo('.loader__logo', { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.6 })
    .to(loader, { opacity: 0, duration: 0.5, ease: 'power2.inOut' }, '+=0.25')
    .fromTo('[data-hero-media]', { scale: 1.08 }, { scale: 1, duration: 1.8 }, '<')
    .to('[data-hero-in]', { y: 0, opacity: 1, duration: 0.9, stagger: 0.08 }, '-=1.5')
    .add(() => loader.remove());

  // Hero au scroll
  gsap.to('[data-hero-media]', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } });

  // Compteurs
  $$('[data-count]').forEach((el) => {
    const obj = { v: 0 };
    gsap.to(obj, {
      v: +el.dataset.count, duration: 1.4, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => { el.textContent = Math.round(obj.v); },
    });
  });

  // Texte du capitaine
  const ws = $$('.w');
  ScrollTrigger.create({
    trigger: '[data-words]', start: 'top 80%', end: 'bottom 45%', scrub: true,
    onUpdate: (self) => {
      const n = Math.round(self.progress * ws.length);
      ws.forEach((w, i) => w.classList.toggle('is-on', i < n));
    },
  });

  // Apparitions
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // Parcours : épinglé, la route se trace
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1081px)', () => {
    ScrollTrigger.create({
      trigger: '[data-parcours]', start: 'top top', end: '+=240%',
      pin: '.parcours__inner', scrub: 0.8,
      onUpdate: (self) => drawRoute(self.progress),
    });
  });
  mm.add('(max-width: 1080px)', () => {
    ScrollTrigger.create({
      trigger: '.parcours__map',
      start: () => 'top ' + (nav.offsetHeight + 12) + 'px',
      end: '+=220%', pin: true, scrub: 1, invalidateOnRefresh: true,
      onUpdate: (self) => drawRoute(self.progress),
    });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());

  /* ------------------------------------------------------------------ */

  function initSliders() {
    $$('[data-slider]').forEach((slider) => {
      const track = $('[data-track]', slider);
      const prev = $('[data-prev]', slider);
      const next = $('[data-next]', slider);
      const bar = $('[data-progress]', slider);
      const step = () => {
        const item = track.children[0];
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        return item ? item.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
      };
      const sync = () => {
        const max = track.scrollWidth - track.clientWidth;
        const p = max > 0 ? track.scrollLeft / max : 0;
        const visible = Math.max(track.clientWidth / track.scrollWidth, 0.1);
        bar.style.width = visible * 100 + '%';
        bar.style.transform = `translateX(${p * (1 / visible - 1) * 100}%)`;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max - 2;
      };
      prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
      next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));
      track.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);
      track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
      });

      let down = false, startX = 0, startLeft = 0, moved = false;
      track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return;
        down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
        track.classList.add('is-dragging');
      });
      window.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 4) moved = true;
        track.scrollLeft = startLeft - dx;
      });
      window.addEventListener('pointerup', () => {
        if (!down) return;
        down = false;
        track.classList.remove('is-dragging');
      });
      track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
      track.addEventListener('dragstart', (e) => e.preventDefault());
      sync();
    });
  }

  function initBooking() {
    const form = $('[data-booking]');
    if (!form) return;
    const totalEl = $('[data-total]', form);
    const err = $('[data-error]', form);
    const pmr = $('[data-pmr]', form);
    const pmrCount = $('[data-pmr-count]', form);
    const demiOnly = $('[data-demi-only]', form);
    const dateInput = form.elements.date;
    const counts = {};
    let shown = 170;

    const today = new Date();
    dateInput.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    $$('[data-counter]', form).forEach((c) => {
      const key = c.dataset.counter;
      const out = $('output', c);
      const min = +c.dataset.min, max = +c.dataset.max;
      counts[key] = +out.textContent;
      c._sync = () => {
        out.textContent = counts[key];
        $('[data-dec]', c).disabled = counts[key] <= min;
        $('[data-inc]', c).disabled = counts[key] >= max || (key !== 'fauteuils' && counts.adultes + (counts.petits || 0) >= 12);
      };
      $('[data-dec]', c).addEventListener('click', () => { counts[key] = Math.max(min, counts[key] - 1); update(); });
      $('[data-inc]', c).addEventListener('click', () => { counts[key] = Math.min(max, counts[key] + 1); update(); });
    });

    const formule = () => form.querySelector('input[name="formule"]:checked');
    // tarif -6 ans publié uniquement pour la journée avec déjeuner
    const price = () => +formule().dataset.price * counts.adultes + (formule().value === 'journee-dej' ? 40 * counts.petits : 0);

    function update() {
      $$('[data-counter]', form).forEach((c) => c._sync());
      demiOnly.hidden = formule().value !== 'demi';
      pmrCount.hidden = !pmr.checked;
      const target = price();
      if (animated) {
        const o = { v: shown };
        gsap.to(o, { v: target, duration: 0.45, ease: 'power2.out', onUpdate: () => { totalEl.textContent = Math.round(o.v); } });
      } else {
        totalEl.textContent = target;
      }
      shown = target;
    }

    form.addEventListener('change', update);
    $$('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      const r = form.querySelector(`input[value="${b.dataset.pick}"]`);
      if (r) { r.checked = true; update(); }
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      err.textContent = '';
      dateInput.removeAttribute('aria-invalid');
      form.elements.nom.removeAttribute('aria-invalid');
      if (!dateInput.value) {
        dateInput.setAttribute('aria-invalid', 'true');
        err.textContent = 'Choisissez une date pour votre sortie';
        dateInput.focus();
        return;
      }
      if (!form.elements.nom.value.trim()) {
        form.elements.nom.setAttribute('aria-invalid', 'true');
        err.textContent = 'Indiquez votre nom pour que Manu puisse vous répondre';
        form.elements.nom.focus();
        return;
      }
      const f = formule();
      const label = f.closest('.chip').querySelector('span').firstChild.textContent.trim();
      const d = new Date(dateInput.value + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const lines = [
        'Bonjour Manu,',
        `Je souhaite réserver : ${label}${f.value === 'demi' ? ' (' + form.elements.creneau.value + ')' : ''}`,
        `Date : ${d}`,
        `Passagers : ${counts.adultes} adulte(s) et enfant(s) de 6 ans et plus` + (counts.petits ? `, ${counts.petits} enfant(s) de moins de 6 ans` : ''),
        pmr.checked ? `Fauteuil(s) roulant(s) : ${counts.fauteuils}` : '',
        `Estimation : ${price()} €`,
        `Nom : ${form.elements.nom.value.trim()}`,
      ].filter(Boolean).join('\n');
      window.open('https://wa.me/596696079132?text=' + encodeURIComponent(lines), '_blank', 'noopener');
    });

    update();
  }

  function initGps() {
    const btn = $('[data-gps]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const lat = 14.679323581913328, lng = -60.93745217695152;
      if (/iPad|iPhone|iPod/.test(navigator.userAgent || '')) window.location.href = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
      else window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank', 'noopener');
    });
  }

  function initBelle() {
    const btn = $('[data-belle]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (document.getElementById('custom-widget-sdk')) return;
      const cfg = document.createElement('div');
      cfg.className = 'custom-widget-config';
      cfg.dataset.title = 'Réserver une sortie';
      cfg.dataset.pageId = '271267';
      cfg.dataset.pageTitle = 'Les Balades de Manu';
      document.body.appendChild(cfg);
      const js = document.createElement('script');
      js.id = 'custom-widget-sdk';
      js.src = 'https://www.bellemartinique.com/reservation.js';
      document.body.appendChild(js);
      btn.textContent = 'Le module Belle Martinique s’ouvre en bas de l’écran';
    });
  }
})();
