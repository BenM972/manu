(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (reduced || !hasGsap) root.classList.add('reduced');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Défilement doux
  let lenis = null;
  if (!reduced && hasGsap && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const scrollToHash = (hash) => {
    const target = hash === '#top' ? 0 : $(hash);
    if (target === null) return;
    const behavior = reduced ? 'auto' : 'smooth';
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -64, duration: 1.4 });
    else if (target === 0) window.scrollTo({ top: 0, behavior });
    else target.scrollIntoView({ behavior });
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
  const animated = () => !reduced && hasGsap;
  let menuTl = null;

  function openMenu() {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    $('[data-nav]').classList.remove('is-solid');
    lenis && lenis.stop();
    if (!animated()) return;
    menuTl && menuTl.kill();
    menuTl = gsap.timeline()
      .to(navLogo, { scale: 0.4, rotate: -30, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .fromTo(menuLogo,
        { scale: 0.2, rotate: -200, y: -120, opacity: 0 },
        { scale: 1, rotate: 0, y: 0, opacity: 1, duration: 1, ease: 'back.out(1.6)' }, 0.15)
      .to(menuLogo, { rotate: -4, duration: 0.25, ease: 'sine.inOut', yoyo: true, repeat: 1 }, '-=0.15')
      .fromTo(menuLinks,
        { y: 36, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.06 }, 0.45);
  }

  function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    burger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    lenis && lenis.start();
    const done = () => {
      menu.classList.remove('is-open');
      $('[data-nav]').classList.toggle('is-solid', window.scrollY > 24);
    };
    if (!animated()) { done(); return; }
    menuTl && menuTl.kill();
    menuTl = gsap.timeline({ onComplete: done })
      .to(menuLinks, { y: -20, opacity: 0, duration: 0.25, ease: 'power2.in', stagger: 0.03 }, 0)
      .to(menuLogo, { scale: 0.2, rotate: 220, y: -160, opacity: 0, duration: 0.55, ease: 'back.in(1.4)' }, 0.05)
      .fromTo(navLogo, { scale: 0.4, rotate: 40, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.7, ease: 'back.out(2)' }, 0.45);
  }

  burger.addEventListener('click', () => {
    menu.classList.contains('is-open') && burger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // Navigation
  const nav = $('[data-nav]');
  const call = $('.call');
  const bookFab = $('[data-book-fab]');
  let bookingInView = false;
  new IntersectionObserver((entries) => {
    bookingInView = entries[0].isIntersecting;
    onScroll();
  }, { threshold: 0.15 }).observe(document.getElementById('reserver'));
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    const heroH = window.innerHeight * 0.85;
    if (!menu.classList.contains('is-open')) nav.classList.toggle('is-solid', y > 24);
    call.classList.toggle('is-visible', y > heroH);
    bookFab.classList.toggle('is-visible', y > heroH && !bookingInView);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = $$('.nav__links a');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((l) => l.classList.toggle('is-current', l.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['excursions', 'parcours', 'capitaine', 'accessibilite', 'avis'].forEach((id) => { const el = document.getElementById(id); el && io.observe(el); });

  // Découpage du texte
  $$('[data-split] .line').forEach((line) => {
    line.innerHTML = `<span>${line.innerHTML}</span>`;
  });

  const words = $('[data-words]');
  if (words) {
    words.innerHTML = words.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  }

  const footerWord = $('[data-footer-word]');
  if (footerWord) {
    footerWord.innerHTML = [...footerWord.textContent].map((c) => c === ' ' ? ' ' : `<span class="ch">${c}</span>`).join('');
  }

  // Réservation
  initBooking();
  initSliders();
  initGps();
  initBelle();

  if (reduced || !hasGsap) {
    $$('.w').forEach((w) => w.classList.add('is-on'));
    $$('[data-count]').forEach((el) => { el.textContent = el.dataset.count; });
    const loader = $('.loader'); loader && loader.remove();
    initParcoursStatic();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const ease = 'expo.out';

  // Loader puis entrée du hero
  const loader = $('.loader');
  gsap.set('.hero__title .line > span', { yPercent: 110 });
  gsap.set('.hero [data-reveal-up]', { y: 24, opacity: 0 });
  gsap.set('[data-hero-media]', { scale: 1.18 });
  gsap.set('[data-sticker]', { scale: 0, rotate: -40 });
  gsap.set(loader, { clipPath: 'circle(150% at 50% 50%)' });

  const intro = gsap.timeline({ defaults: { ease } });
  intro
    .fromTo('.loader__logo', { scale: 0.4, rotate: -14, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.9, ease: 'back.out(1.8)' })
    .fromTo('.loader .roots i', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left', duration: 0.35, stagger: 0.12, ease: 'power2.out' }, '-=0.3')
    .to(loader, { clipPath: 'circle(0% at 50% 50%)', duration: 0.9, ease: 'expo.inOut' }, '+=0.2')
    .to('[data-hero-media]', { scale: 1, duration: 1.8 }, '<')
    .to('.hero__title .line > span', { yPercent: 0, duration: 1.2, stagger: 0.09 }, '-=1.2')
    .to('.hero [data-reveal-up]', { y: 0, opacity: 1, duration: 0.9, stagger: 0.08 }, '-=0.9')
    .to('[data-sticker]', { scale: 1, rotate: 12, duration: 0.9, ease: 'back.out(2)' }, '-=0.6')
    .add(() => loader.remove());

  // Hero au scroll
  gsap.timeline({
    scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
  })
    .to('[data-hero-media]', { scale: 1.12, yPercent: 12, ease: 'none' }, 0)
    .to('.hero__content', { y: -80, opacity: 0, ease: 'none' }, 0)
    .to('[data-sticker]', { y: -160, rotate: 40, ease: 'none' }, 0);

  // Manifeste
  const ws = $$('.w');
  ScrollTrigger.create({
    trigger: '[data-words]',
    start: 'top 78%',
    end: 'bottom 42%',
    scrub: true,
    onUpdate: (self) => {
      const n = Math.round(self.progress * ws.length);
      ws.forEach((w, i) => w.classList.toggle('is-on', i < n));
    },
  });

  // Compteurs
  $$('[data-count]').forEach((el) => {
    const obj = { v: 0 };
    gsap.to(obj, {
      v: +el.dataset.count,
      duration: 1.6,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => { el.textContent = Math.round(obj.v); },
    });
  });

  // Titres en lignes et blocs qui montent
  $$('.access [data-split]').forEach((title) => {
    gsap.from($$('.line > span', title), {
      yPercent: 110, duration: 1.2, ease, stagger: 0.1,
      scrollTrigger: { trigger: title, start: 'top 80%' },
    });
  });
  $$('main .title').forEach((h) => {
    gsap.from(h, { y: 40, opacity: 0, duration: 1.1, ease, scrollTrigger: { trigger: h, start: 'top 85%' } });
  });
  $$('main [data-reveal-up]').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.from(el, { y: 32, opacity: 0, duration: 0.9, ease, scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // Bandeau qui défile avec le scroll
  const ticker = $('[data-ticker]');
  gsap.fromTo(ticker, { xPercent: 0 }, {
    xPercent: -50, ease: 'none',
    scrollTrigger: { trigger: '.ticker', start: 'top bottom', end: () => '+=' + window.innerHeight * 2.4, scrub: 0.5 },
  });

  // Cartes stats
  gsap.from('.stat', {
    y: 60, rotate: (i) => (i % 2 ? 8 : -8), opacity: 0, duration: 0.9, ease: 'back.out(1.6)', stagger: 0.08,
    scrollTrigger: { trigger: '.stats', start: 'top 88%' },
  });

  // Polaroids : ils tombent sur la page
  $$('[data-polaroid]').forEach((p) => {
    gsap.from(p, {
      y: -60, rotate: '+=14', opacity: 0, duration: 1, ease: 'back.out(1.4)',
      scrollTrigger: { trigger: p, start: 'top 85%' },
    });
  });

  // Cartes des excursions
  gsap.from('.offer', {
    y: 120, rotate: (i) => [-12, 10, -8][i] || 0, opacity: 0, duration: 1.1, ease: 'back.out(1.3)', stagger: 0.14,
    scrollTrigger: { trigger: '[data-offers]', start: 'top 82%' },
    clearProps: 'transform',
  });
  gsap.from('.offer__price', { scale: 0, rotate: -90, duration: 0.8, ease: 'back.out(2.2)', stagger: 0.14, delay: 0.5, scrollTrigger: { trigger: '[data-offers]', start: 'top 82%' } });
  gsap.from('.carte__extra', { scale: 0.6, rotate: -14, opacity: 0, duration: 0.8, ease: 'back.out(2)', scrollTrigger: { trigger: '.carte__extra', start: 'top 92%' } });

  const mm = gsap.matchMedia();

  // Parcours
  const route = $('[data-route]');
  const boat = $('[data-boat]');
  const stops = $$('[data-stop]');
  const steps = $$('[data-step]');
  const photos = $$('[data-photos] img');
  const len = route.getTotalLength();
  // position de chaque escale le long de la route
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
  route.style.strokeDasharray = `${len}`;
  route.style.strokeDashoffset = `${len}`;

  const setActive = (idx) => {
    stops.forEach((s, i) => s.classList.toggle('is-active', i <= idx));
    steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    photos.forEach((p, i) => p.classList.toggle('is-active', i === idx));
  };
  const drawRoute = (p) => {
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
  drawRoute(0);

  mm.add('(min-width: 1081px)', () => {
    ScrollTrigger.create({
      trigger: '[data-parcours]',
      start: 'top top',
      end: '+=260%',
      pin: '.parcours__inner',
      scrub: 0.8,
      onUpdate: (self) => drawRoute(self.progress),
    });
  });
  mm.add('(max-width: 1080px)', () => {
    ScrollTrigger.create({
      trigger: '.map',
      start: 'top 75%',
      end: 'bottom 25%',
      scrub: 0.8,
      onUpdate: (self) => drawRoute(self.progress),
    });
  });

  // Capitaine
  gsap.fromTo('[data-clip]', { clipPath: 'inset(18% 12% 18% 12% round 20px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 20px)', ease: 'none',
    scrollTrigger: { trigger: '[data-clip]', start: 'top 90%', end: 'center 55%', scrub: true },
  });
  gsap.fromTo('[data-clip] img', { yPercent: -8 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '[data-clip]', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.from('.quote__bar', { scaleY: 0, transformOrigin: 'top', duration: 1, ease, scrollTrigger: { trigger: '.quote', start: 'top 85%' } });

  gsap.from('.access__item', { y: 40, opacity: 0, duration: 0.8, ease: 'back.out(1.5)', stagger: 0.1, scrollTrigger: { trigger: '.access__grid', start: 'top 85%' } });
  gsap.from('.access__title span', { scale: 0.7, rotate: -6, opacity: 0, duration: 0.8, ease: 'back.out(2)', scrollTrigger: { trigger: '.access__title', start: 'top 85%' } });
  gsap.from('.slogan', { scale: 0.5, rotate: -12, opacity: 0, duration: 0.8, ease: 'back.out(2)', scrollTrigger: { trigger: '.slogan', start: 'top 90%' } });
  gsap.from('.booking', { y: 80, rotate: 6, opacity: 0, duration: 1, ease, scrollTrigger: { trigger: '.booking', start: 'top 85%' } });

  // Pied de page
  gsap.from('.footer__word .ch', {
    yPercent: 100, opacity: 0, duration: 1, ease, stagger: 0.025,
    scrollTrigger: { trigger: '.footer__word', start: 'top 95%' },
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());

  function initParcoursStatic() {
    const route = $('[data-route]');
    const boat = $('[data-boat]');
    if (!route) return;
    const pt = route.getPointAtLength(route.getTotalLength() * 0.64);
    boat.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    $$('[data-stop]').forEach((s) => s.classList.add('is-active'));
    $$('[data-step]').forEach((s) => s.classList.add('is-active'));
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
      const sync = () => {
        out.textContent = counts[key];
        $('[data-dec]', c).disabled = counts[key] <= min;
        $('[data-inc]', c).disabled = counts[key] >= max || (key !== 'fauteuils' && counts.adultes + (counts.petits || 0) >= 12);
      };
      c._sync = sync;
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
      if (hasGsap && !reduced) {
        const o = { v: shown };
        gsap.to(o, { v: target, duration: 0.5, ease: 'power3.out', onUpdate: () => { totalEl.textContent = Math.round(o.v); } });
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
        const visible = track.clientWidth / track.scrollWidth;
        bar.style.width = Math.max(visible, 0.08) * 100 + '%';
        bar.style.transform = `translateX(${p * (1 / Math.max(visible, 0.08) - 1) * 100}%)`;
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

      // Glisser à la souris
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

  function initGps() {
    const btn = $('[data-gps]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const lat = 14.679323581913328, lng = -60.93745217695152;
      const ua = navigator.userAgent || '';
      if (/iPad|iPhone|iPod/.test(ua)) window.location.href = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
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
