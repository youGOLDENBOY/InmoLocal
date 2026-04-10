/* ═══════════════════════════════════════════════════════════
   InmoLocal — main.js
   Lógica de UI: navbar, filtros, favoritos, hamburger
   (Firebase se conecta en firebase.js en la siguiente fase)
═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── NAVBAR: scroll effect ───
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });

  // ─── HAMBURGER ───
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      const spans = hamburger.querySelectorAll('span');
      const isOpen = mobileMenu.classList.contains('open');
      spans[0].style.transform = isOpen ? 'rotate(45deg) translate(5px,5px)' : '';
      spans[1].style.opacity  = isOpen ? '0' : '1';
      spans[2].style.transform = isOpen ? 'rotate(-45deg) translate(5px,-5px)' : '';
    });
  }

  // ─── FILTER CHIPS ───
  const chips = document.querySelectorAll('.chip');
  const cards = document.querySelectorAll('.prop-card:not(.ad-card)');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;

      cards.forEach(card => {
        const type  = card.dataset.type  || '';
        const modal = card.dataset.modal || '';

        let show = false;
        if (filter === 'todo') {
          show = true;
        } else if (filter === 'casa-venta') {
          show = type === 'casa' && modal === 'venta';
        } else if (filter === 'casa-alquiler') {
          show = type === 'casa' && modal === 'alquiler';
        } else if (filter === 'apartamento-venta') {
          show = type === 'apartamento' && modal === 'venta';
        } else if (filter === 'apartamento-alquiler') {
          show = type === 'apartamento' && modal === 'alquiler';
        }

        card.style.display = show ? '' : 'none';
      });
    });
  });

  // ─── VIEW TOGGLE (grid / list) ───
  const grid    = document.getElementById('propertiesGrid');
  const btnGrid = document.getElementById('viewGrid');
  const btnList = document.getElementById('viewList');

  if (btnGrid && btnList && grid) {
    btnGrid.addEventListener('click', () => {
      grid.classList.remove('list-view');
      btnGrid.classList.add('active');
      btnList.classList.remove('active');
    });
    btnList.addEventListener('click', () => {
      grid.classList.add('list-view');
      btnList.classList.add('active');
      btnGrid.classList.remove('active');
    });
  }

  // ─── FAVORITE BUTTONS ───
  const favBtns = document.querySelectorAll('.fav-btn');
  favBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.toggle('active');
      btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
      // TODO: guardar en Firebase Firestore cuando el usuario esté logueado
    });
  });

  // ─── SEARCH BAR (básico, sin Firebase aún) ───
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const type  = document.getElementById('filterType')?.value  || '';
      const modal = document.getElementById('filterModal')?.value || '';
      const price = document.getElementById('filterPrice')?.value || '';

      // Filtrar las tarjetas visibles
      cards.forEach(card => {
        const t = card.dataset.type  || '';
        const m = card.dataset.modal || '';

        const matchType  = !type  || t === type;
        const matchModal = !modal || m === modal;
        // Para precio necesitamos Firebase, de momento dejamos pasar
        const matchPrice = true;

        card.style.display = (matchType && matchModal && matchPrice) ? '' : 'none';
      });

      // Reset chips
      chips.forEach(c => c.classList.remove('active'));
      const todoChip = document.querySelector('.chip[data-filter="todo"]');
      if (todoChip) todoChip.classList.add('active');

      // Scroll suave a las propiedades
      document.getElementById('propiedades')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ─── HERO STATS (animación contador) ───
  function animateCount(el, target, duration = 1200) {
    if (!el) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        el.textContent = target;
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(start);
      }
    }, 16);
  }

  // Observer para disparar animación al entrar en pantalla
  const statsEl = document.querySelector('.hero-stats');
  if (statsEl) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          // Estos números vendrán de Firebase en la siguiente fase
          animateCount(document.getElementById('statTotal'),   12);
          animateCount(document.getElementById('statVenta'),    7);
          animateCount(document.getElementById('statAlquiler'), 5);
          obs.disconnect();
        }
      });
    }, { threshold: 0.3 });
    obs.observe(statsEl);
  }

  // ─── LOAD MORE (simulado, se reemplaza con paginación Firebase) ───
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      loadMoreBtn.textContent = 'Cargando...';
      loadMoreBtn.disabled = true;
      setTimeout(() => {
        // TODO: cargar siguiente página de Firebase
        loadMoreBtn.textContent = 'No hay más propiedades por ahora';
        loadMoreBtn.style.opacity = '0.5';
      }, 1000);
    });
  }

  // ─── CARD ANIMATION on scroll ───
  const propCards = document.querySelectorAll('.prop-card');
  const cardObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.animationDelay = `${i * 0.05}s`;
        entry.target.classList.add('visible');
        cardObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  propCards.forEach(card => cardObs.observe(card));

  // ─── AUTH STATE (placeholder — Firebase lo maneja en firebase.js) ───
  // Por ahora mostramos el estado "guest" por defecto
  // En firebase.js: onAuthStateChanged() alternará entre authGuest y authUser
  const authGuest = document.getElementById('authGuest');
  const authUser  = document.getElementById('authUser');

  // Simulación: si hay usuario guardado en localStorage (temporal)
  const mockUser = null; // Se reemplaza con Firebase Auth
  if (mockUser) {
    authGuest?.classList.add('hidden');
    authUser?.classList.remove('hidden');
  }

  // ─── LOGOUT ───
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // TODO: firebase.auth().signOut()
      authUser?.classList.add('hidden');
      authGuest?.classList.remove('hidden');
    });
  }

  console.log('🏠 InmoLocal — main.js cargado correctamente');
});
