/* ═══════════════════════════════════════════════════════════
   InmoLocal — main.js  v2
   Auth real · Mobile menu · Filtros · Animaciones
═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── Navbar scroll effect ───
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // ─── Hamburger / mobile menu ───
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  hamburger?.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    // Bloquear scroll del body cuando el menú está abierto
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Cerrar menú al hacer tap fuera
  document.addEventListener('click', (e) => {
    if (mobileMenu?.classList.contains('open') &&
        !mobileMenu.contains(e.target) &&
        !hamburger.contains(e.target)) {
      cerrarMenu();
    }
  });

  // Cerrar al hacer clic en un link del menú
  mobileMenu?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      if (!a.id?.includes('Logout')) cerrarMenu();
    });
  });

  // ─── Logout botones ───
  document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await auth.signOut();
    window.location.href = 'index.html';
  });
  document.getElementById('mobileLogoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    cerrarMenu();
    await auth.signOut();
    window.location.href = 'index.html';
  });

  // ─── Avatar dropdown — toggle en móvil al tap ───
  document.getElementById('avatarWrap')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('avatarWrap').classList.toggle('open');
  });
  document.addEventListener('click', () => {
    document.getElementById('avatarWrap')?.classList.remove('open');
  });

  // ─── Auth state → actualizar navbar ───
  // firebase.js ya llama onAuthStateChanged globalmente,
  // pero también lo manejamos aquí para el menú mobile
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
      actualizarNavbar(user);
    });
  }

  // ─── Filter chips ───
  const chips = document.querySelectorAll('.chip');
  const cards = document.querySelectorAll('.prop-card:not(.ad-card)');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filtrarCards(chip.dataset.filter, cards);
    });
  });

  // ─── View toggle grid/list ───
  const grid    = document.getElementById('propertiesGrid');
  const btnGrid = document.getElementById('viewGrid');
  const btnList = document.getElementById('viewList');

  btnGrid?.addEventListener('click', () => {
    grid?.classList.remove('list-view');
    btnGrid.classList.add('active');
    btnList?.classList.remove('active');
  });
  btnList?.addEventListener('click', () => {
    grid?.classList.add('list-view');
    btnList.classList.add('active');
    btnGrid?.classList.remove('active');
  });

  // ─── Fav buttons ───
  document.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (typeof auth !== 'undefined' && !auth.currentUser) {
        window.location.href = 'login.html';
        return;
      }
      btn.classList.toggle('active');
      btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
    });
  });

  // ─── Search bar ───
  document.getElementById('searchBtn')?.addEventListener('click', () => {
    const type  = document.getElementById('filterType')?.value  || '';
    const modal = document.getElementById('filterModal')?.value || '';

    cards.forEach(card => {
      const t = card.dataset.type  || '';
      const m = card.dataset.modal || '';
      const show = (!type || t === type) && (!modal || m === modal);
      card.style.display = show ? '' : 'none';
    });

    chips.forEach(c => c.classList.remove('active'));
    document.querySelector('.chip[data-filter="todo"]')?.classList.add('active');
    document.getElementById('propiedades')?.scrollIntoView({ behavior: 'smooth' });
  });

  // ─── Contador animado stats ───
  const statsEl = document.querySelector('.hero-stats');
  if (statsEl) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCount(document.getElementById('statTotal'),   12);
          animateCount(document.getElementById('statVenta'),    7);
          animateCount(document.getElementById('statAlquiler'), 5);
          obs.disconnect();
        }
      });
    }, { threshold: 0.3 });
    obs.observe(statsEl);
  }

  // ─── Load more ───
  document.getElementById('loadMoreBtn')?.addEventListener('click', function() {
    this.textContent = 'No hay más propiedades por ahora';
    this.style.opacity = '0.5';
    this.disabled = true;
  });

  // ─── Card animations on scroll ───
  const propCards = document.querySelectorAll('.prop-card');
  if ('IntersectionObserver' in window) {
    const cardObs = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.style.opacity = '1', i * 50);
          cardObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05 });
    propCards.forEach(card => {
      card.style.opacity = '0';
      card.style.transition = 'opacity .4s ease';
      cardObs.observe(card);
    });
  }
});

// ─── Actualizar navbar según auth state ───
function actualizarNavbar(user) {
  const authGuest          = document.getElementById('authGuest');
  const authUser           = document.getElementById('authUser');
  const avatarFallback     = document.getElementById('avatarFallback');
  const mobileUserSection  = document.getElementById('mobileUserSection');
  const mobileLoggedLinks  = document.getElementById('mobileLoggedLinks');
  const mobileGuestBtns    = document.getElementById('mobileGuestBtns');
  const mobileAvatar       = document.getElementById('mobileAvatar');
  const mobileUserName     = document.getElementById('mobileUserName');
  const mobileUserEmail    = document.getElementById('mobileUserEmail');

  if (user) {
    // Mostrar estado logueado
    authGuest?.classList.add('hidden');
    authUser?.classList.remove('hidden');

    const ini = (user.displayName || user.email || 'U')[0].toUpperCase();
    if (avatarFallback)    avatarFallback.textContent    = ini;
    if (mobileAvatar)      mobileAvatar.textContent      = ini;
    if (mobileUserName)    mobileUserName.textContent    = user.displayName || 'Mi cuenta';
    if (mobileUserEmail)   mobileUserEmail.textContent   = user.email || '';
    mobileUserSection?.classList.remove('hidden');
    mobileLoggedLinks?.classList.remove('hidden');
    mobileGuestBtns?.classList.add('hidden');

  } else {
    // Mostrar estado guest
    authGuest?.classList.remove('hidden');
    authUser?.classList.add('hidden');
    mobileUserSection?.classList.add('hidden');
    mobileLoggedLinks?.classList.add('hidden');
    mobileGuestBtns?.classList.remove('hidden');
  }
}

// ─── Cerrar menú mobile ───
window.cerrarMenu = function() {
  const mobileMenu = document.getElementById('mobileMenu');
  const hamburger  = document.getElementById('hamburger');
  mobileMenu?.classList.remove('open');
  hamburger?.classList.remove('open');
  document.body.style.overflow = '';
};

// ─── Filtrar cards ───
function filtrarCards(filter, cards) {
  cards.forEach(card => {
    const type  = card.dataset.type  || '';
    const modal = card.dataset.modal || '';
    let show = false;
    if (filter === 'todo')                   show = true;
    else if (filter === 'casa-venta')        show = type === 'casa'        && modal === 'venta';
    else if (filter === 'casa-alquiler')     show = type === 'casa'        && modal === 'alquiler';
    else if (filter === 'apartamento-venta') show = type === 'apartamento' && modal === 'venta';
    else if (filter === 'apartamento-alquiler') show = type === 'apartamento' && modal === 'alquiler';
    card.style.display = show ? '' : 'none';
  });
}

// ─── Contador animado ───
function animateCount(el, target, duration = 1000) {
  if (!el) return;
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { el.textContent = target; clearInterval(timer); }
    else el.textContent = Math.floor(start);
  }, 16);
}
