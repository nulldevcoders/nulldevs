/* ═══════════════════════════════════════════════════
   NULL DEVS — main.js
   All client-side behaviour
═══════════════════════════════════════════════════ */

'use strict';

// ─── Theme ────────────────────────────────────────────────────────────────────
(function initTheme() {
  let dark = false;
  try { dark = localStorage.getItem('nd-theme') === 'dark'; } catch (_) {}
  if (dark) document.documentElement.classList.add('dark');
})();

document.addEventListener('DOMContentLoaded', function () {

  // ─── Theme toggle ───────────────────────────────────────────────────────────
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      const isDark = document.documentElement.classList.toggle('dark');
      try { localStorage.setItem('nd-theme', isDark ? 'dark' : 'light'); } catch (_) {}
      updateNavStyle();
    });
  }

  // ─── Navbar scroll ──────────────────────────────────────────────────────────
  const navbar = document.getElementById('navbar');
  function updateNavStyle() {
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 18);
  }
  window.addEventListener('scroll', updateNavStyle, { passive: true });
  updateNavStyle();

  // ─── Mobile nav ─────────────────────────────────────────────────────────────
  const burger    = document.getElementById('nd-burger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      const open = mobileMenu.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      mobileMenu.setAttribute('aria-hidden', String(!open));
    });
    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });
  }

  // ─── Scroll reveal ──────────────────────────────────────────────────────────
  const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));
  revealEls.forEach(function (el) {
    const delay = parseInt(el.getAttribute('data-delay') || '0', 10);
    el.style.transitionDelay = delay + 'ms';
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  // ─── Stat counters ──────────────────────────────────────────────────────────
  const countEls = Array.from(document.querySelectorAll('[data-count]'));
  if (countEls.length && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        const el       = e.target;
        const target   = parseFloat(el.getAttribute('data-count'));
        const suffix   = el.getAttribute('data-suffix') || '';
        const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
        const dur      = 1500;
        const t0       = performance.now();

        function step(now) {
          const p     = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          const v     = target * eased;
          el.textContent = (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString()) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        cio.unobserve(el);
      });
    }, { threshold: 0.5 });
    countEls.forEach(function (el) { cio.observe(el); });
  }

  // ─── Process line ────────────────────────────────────────────────────────────
  const procLine = document.getElementById('procLine');
  if (procLine && 'IntersectionObserver' in window) {
    const pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { procLine.style.width = '100%'; pio.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    if (procLine.parentElement) pio.observe(procLine.parentElement);
  }

  // ─── Capability tabs ─────────────────────────────────────────────────────────
  const capTabs   = Array.from(document.querySelectorAll('.cap-tab'));
  const capPanels = Array.from(document.querySelectorAll('.cap-panel'));
  capTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const key = tab.getAttribute('data-cap');
      capTabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-cap') === key); });
      capPanels.forEach(function (p) { p.classList.toggle('active', p.getAttribute('data-panel') === key); });
    });
  });

  // ─── Hero parallax (mouse) ───────────────────────────────────────────────────
  const heroSection = document.getElementById('top');
  const tiltCard    = document.querySelector('.hero-dashboard');
  if (heroSection && tiltCard) {
    heroSection.addEventListener('mousemove', function (e) {
      const r  = tiltCard.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - 0.5;
      const py = (e.clientY - r.top)  / r.height - 0.5;
      tiltCard.style.transform =
        'translate(-50%, -50%) perspective(900px) rotateY(' + (px * 9) + 'deg) rotateX(' + (-py * 9) + 'deg)';
    });
    heroSection.addEventListener('mouseleave', function () {
      tiltCard.style.transform = 'translate(-50%, -50%)';
    });
  }

  // ─── Particle canvas ─────────────────────────────────────────────────────────
  initParticles();

  // ─── Contact form ────────────────────────────────────────────────────────────
  initContactForm();

});

// ─── Particles ────────────────────────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('nd-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const parent = canvas.parentElement;
  let alive = true;

  function resize() {
    const r = parent.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const N   = Math.max(22, Math.min(46, Math.floor(window.innerWidth / 32)));
  const pts = Array.from({ length: N }, function () {
    return { x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 };
  });
  const mouse = { x: -9999, y: -9999 };

  window.addEventListener('mousemove', function (e) {
    const r = parent.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  }, { passive: true });

  function draw() {
    if (!alive) return;
    ctx.clearRect(0, 0, w, h);
    const dark = document.documentElement.classList.contains('dark');

    pts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(31,209,176,.55)';
      ctx.fill();
    });

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = 'rgba(31,209,176,' + (0.16 * (1 - dist / 120)) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      const mdx = pts[i].x - mouse.x, mdy = pts[i].y - mouse.y;
      const md  = Math.hypot(mdx, mdy);
      if (md < 160) {
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = (dark ? 'rgba(255,255,255,' : 'rgba(10,13,20,') + (0.12 * (1 - md / 160)) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // Cleanup on SPA navigation (not needed here but good practice)
  window.addEventListener('beforeunload', function () { alive = false; });
}

// ─── Contact Form ──────────────────────────────────────────────────────────────
function initContactForm() {
  const form       = document.getElementById('contactForm');
  if (!form) return;

  const nameInput  = document.getElementById('fname');
  const emailInput = document.getElementById('femail');
  const msgInput   = document.getElementById('fmessage');
  const charCount  = document.getElementById('charCount');
  const nameErr    = document.getElementById('nameErr');
  const emailErr   = document.getElementById('emailErr');
  const msgErr     = document.getElementById('msgErr');
  const submitBtn  = document.getElementById('submitBtn');
  const successEl  = document.getElementById('formSuccess');
  const errorEl    = document.getElementById('formError');

  // Char counter
  if (msgInput && charCount) {
    msgInput.addEventListener('input', function () {
      const len = msgInput.value.length;
      charCount.textContent = len;
      charCount.style.color = len > 4500 ? '#ff6b6b' : '';
    });
  }

  // Clear errors on input
  function clearErr(input, errEl) {
    input.classList.remove('error');
    if (errEl) errEl.textContent = '';
  }
  if (nameInput)  nameInput.addEventListener('input',  function () { clearErr(nameInput, nameErr); });
  if (emailInput) emailInput.addEventListener('input', function () { clearErr(emailInput, emailErr); });
  if (msgInput)   msgInput.addEventListener('input',   function () { clearErr(msgInput, msgErr); });

  // Client-side validation
  function validate() {
    let ok = true;
    const name  = (nameInput  && nameInput.value.trim())  || '';
    const email = (emailInput && emailInput.value.trim()) || '';
    const msg   = (msgInput   && msgInput.value.trim())   || '';

    if (name.length < 2) {
      if (nameErr) nameErr.textContent = 'Please enter your name.';
      if (nameInput) nameInput.classList.add('error');
      ok = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (emailErr) emailErr.textContent = 'Please enter a valid email address.';
      if (emailInput) emailInput.classList.add('error');
      ok = false;
    }
    if (msg.length < 20) {
      if (msgErr) msgErr.textContent = 'Message must be at least 20 characters.';
      if (msgInput) msgInput.classList.add('error');
      ok = false;
    }
    return ok;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Reset UI
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('visible'); }
    if (successEl) successEl.classList.remove('visible');

    if (!validate()) return;

    // Loading state
    if (submitBtn) { submitBtn.classList.add('loading'); submitBtn.disabled = true; }

    const data = {
      name:    nameInput  ? nameInput.value.trim()  : '',
      email:   emailInput ? emailInput.value.trim() : '',
      company: (form.querySelector('[name="company"]') || {}).value || '',
      service: (form.querySelector('[name="service"]') || {}).value || '',
      budget:  (form.querySelector('[name="budget"]')  || {}).value || '',
      message: msgInput   ? msgInput.value.trim()   : '',
      website: (form.querySelector('[name="website"]') || {}).value || '', // honeypot
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        // Success!
        form.reset();
        if (charCount) charCount.textContent = '0';
        if (successEl) successEl.classList.add('visible');
        // Scroll success into view
        if (successEl) successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        const msg = json.message || 'Something went wrong. Please try again.';
        if (errorEl) { errorEl.textContent = msg; errorEl.classList.add('visible'); }
      }
    } catch (_) {
      if (errorEl) {
        errorEl.textContent = 'Network error. Please check your connection and try again.';
        errorEl.classList.add('visible');
      }
    } finally {
      if (submitBtn) { submitBtn.classList.remove('loading'); submitBtn.disabled = false; }
    }
  });
}
