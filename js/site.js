// ── NAV ──────────────────────────────────────────────────────────
(function() {
  // Hamburger toggle
  const hamburger = document.querySelector('.nav-hamburger');
  const links = document.querySelector('.site-nav__links');
  if (hamburger && links) {
    hamburger.addEventListener('click', () => links.classList.toggle('open'));
  }

  // Active link
  const path = window.location.pathname;
  document.querySelectorAll('.site-nav__links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && path.includes(href) && href !== '/') {
      a.classList.add('active');
    }
  });
})();

// ── SCROLL REVEAL ─────────────────────────────────────────────────
(function() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });

  // Re-trigger for elements already in view
  setTimeout(() => {
    document.querySelectorAll('.reveal').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });
  }, 100);
})();

// ── NEWSLETTER FORM ───────────────────────────────────────────────
(function() {
  const form = document.querySelector('.newsletter-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector('button');
    if (input && btn) {
      btn.textContent = '✓ You\'re in!';
      btn.style.background = '#C9922A';
      input.value = '';
      input.disabled = true;
      btn.disabled = true;
    }
  });
})();
