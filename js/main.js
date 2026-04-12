/* ═══════════════════════════════════════════════════════════
   InmoLocal — main.js  v3
   Carga propiedades reales de Firebase · Filtros · Auth nav
═══════════════════════════════════════════════════════════ */

const WPP_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

// Estado global
let todasLasPropiedades = [];
let favoritosIds        = [];
let filtroActual        = 'todo';
let lastDoc             = null;
const POR_PAGINA        = 9;

document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  setupFiltros();
  setupSearch();
  setupViewToggle();

  // Cargar propiedades al iniciar
  cargarPropiedades();

  // Cargar favoritos si hay sesión
  auth.onAuthStateChanged(async (user) => {
    actualizarNavbar(user);
    if (user) {
      try {
        favoritosIds = await obtenerFavoritos();
      } catch (_) {}
    } else {
      favoritosIds = [];
    }
  });

  // Load more
  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    cargarPropiedades(true);
  });
});

// ════════════════════════════════════════
// CARGAR PROPIEDADES DESDE FIREBASE
// ════════════════════════════════════════

async function cargarPropiedades(append = false) {
  const grid    = document.getElementById('propertiesGrid');
  const loading = document.getElementById('propsLoading');
  const loadBtn = document.getElementById('loadMoreBtn');

  if (!append) {
    loading?.classList.remove('hidden');
    // Limpiar cards previas pero dejar el loading
    grid?.querySelectorAll('.prop-card, .no-results').forEach(el => el.remove());
    lastDoc = null;
  }

  try {
    let query = db.collection('propiedades')
      .where('estado', '==', 'disponible')
      .orderBy('destacada', 'desc')
      .orderBy('creadaEn', 'desc')
      .limit(POR_PAGINA);

    if (lastDoc) query = query.startAfter(lastDoc);

    const snap = await query.get();
    loading?.classList.add('hidden');

    if (snap.empty && !append) {
      grid?.insertAdjacentHTML('beforeend', `
        <div class="no-results">
          <span>🏠</span>
          <p>Aún no hay propiedades publicadas.</p>
          <a href="publicar.html" class="btn-primary" style="margin-top:16px">Sé el primero en publicar</a>
        </div>`);
      return;
    }

    const props = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    lastDoc = snap.docs[snap.docs.length - 1];
    todasLasPropiedades = append ? [...todasLasPropiedades, ...props] : props;

    // Renderizar
    props.forEach(p => {
      const card = crearCardHTML(p);
      grid?.insertAdjacentHTML('beforeend', card);
    });

    // Actualizar stats
    actualizarStats();

    // Mostrar/ocultar load more
    if (snap.docs.length < POR_PAGINA) {
      loadBtn?.classList.add('hidden');
    } else {
      loadBtn?.classList.remove('hidden');
    }

    // Setup fav buttons recién creados
    setupFavBtns();

  } catch (err) {
    loading?.classList.add('hidden');
    console.error('Error cargando propiedades:', err);
    grid?.insertAdjacentHTML('beforeend', `
      <div class="no-results">
        <span>⚠️</span>
        <p>Error cargando propiedades. Intenta de nuevo.</p>
        <button class="btn-primary" onclick="cargarPropiedades()" style="margin-top:16px">Reintentar</button>
      </div>`);
  }
}

// ════════════════════════════════════════
// CREAR HTML DE UNA TARJETA
// ════════════════════════════════════════

function crearCardHTML(p) {
  const moneda  = p.moneda === 'USD' ? 'USD$' : 'RD$';
  const precio  = (p.precio || 0).toLocaleString('es-DO');
  const sufijo  = p.modalidad === 'alquiler' ? '<small>/mes</small>' : '';
  const isFav   = favoritosIds.includes(p.id);
  const ini     = (p.propietarioNombre || 'P')[0].toUpperCase();

  // Imagen
  let imgHTML = '';
  if (p.fotos?.length) {
    imgHTML = `<img src="${p.fotos[0]}" alt="${p.titulo}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
  } else {
    imgHTML = `<div class="prop-img-placeholder">${p.tipo === 'casa' ? '🏠' : '🏢'}</div>`;
  }

  // WhatsApp
  const tel = (p.propietarioTelefono || '').replace(/\D/g, '');
  const wppMsg = encodeURIComponent(`Hola ${p.propietarioNombre}, vi tu propiedad "${p.titulo}" en InmoLocal y me interesa.`);
  const wppBtn = tel
    ? `<a href="https://wa.me/${tel}?text=${wppMsg}" class="btn-wpp" target="_blank" rel="noopener" title="WhatsApp">${WPP_SVG}</a>`
    : '';

  return `
  <article class="prop-card${p.destacada ? ' featured' : ''}" data-id="${p.id}" data-type="${p.tipo}" data-modal="${p.modalidad}">
    <div class="prop-img-wrap">
      ${imgHTML}
      <div class="prop-badges">
        <span class="badge badge-${p.modalidad}">${p.modalidad === 'venta' ? 'Venta' : 'Alquiler'}</span>
        <span class="badge badge-tipo">${p.tipo === 'casa' ? 'Casa' : 'Apartamento'}</span>
        ${p.destacada ? '<span class="badge badge-featured">⭐ Destacada</span>' : ''}
      </div>
      <button class="fav-btn${isFav ? ' active' : ''}" data-id="${p.id}" title="Guardar en favoritos">${isFav ? '♥' : '♡'}</button>
    </div>
    <div class="prop-body">
      <p class="prop-price">${moneda} ${precio} ${sufijo}</p>
      <h3 class="prop-title">${escapeHtml(p.titulo)}</h3>
      <p class="prop-location">📍 ${escapeHtml(p.direccion || '')}</p>
      <div class="prop-features">
        <span>🛏 ${p.habitaciones} hab.</span>
        <span>🚿 ${p.banos} baños</span>
        ${p.metros ? `<span>📐 ${p.metros} m²</span>` : ''}
      </div>
      <div class="prop-footer">
        <div class="prop-owner">
          <div class="owner-avatar">${ini}</div>
          <span>${escapeHtml(p.propietarioNombre || '')}</span>
        </div>
        <div class="prop-actions">
          <a href="propiedad.html?id=${p.id}" class="btn-card">Ver</a>
          ${wppBtn}
        </div>
      </div>
    </div>
  </article>`;
}

// ════════════════════════════════════════
// FAVORITOS
// ════════════════════════════════════════

function setupFavBtns() {
  document.querySelectorAll('.fav-btn[data-id]').forEach(btn => {
    // Evitar duplicar listeners
    btn.replaceWith(btn.cloneNode(true));
  });
  document.querySelectorAll('.fav-btn[data-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const user = auth.currentUser;
      if (!user) { window.location.href = 'login.html'; return; }

      const id  = btn.dataset.id;
      const res = await toggleFavorito(id);
      if (res === true) {
        btn.classList.add('active');
        btn.textContent = '♥';
        if (!favoritosIds.includes(id)) favoritosIds.push(id);
      } else {
        btn.classList.remove('active');
        btn.textContent = '♡';
        favoritosIds = favoritosIds.filter(f => f !== id);
      }
    });
  });
}

// ════════════════════════════════════════
// FILTROS
// ════════════════════════════════════════

function setupFiltros() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filtroActual = chip.dataset.filter;
      aplicarFiltro();
    });
  });
}

function aplicarFiltro() {
  document.querySelectorAll('.prop-card[data-id]').forEach(card => {
    const type  = card.dataset.type  || '';
    const modal = card.dataset.modal || '';
    let show = false;
    if (filtroActual === 'todo')                   show = true;
    else if (filtroActual === 'casa-venta')        show = type === 'casa'        && modal === 'venta';
    else if (filtroActual === 'casa-alquiler')     show = type === 'casa'        && modal === 'alquiler';
    else if (filtroActual === 'apartamento-venta') show = type === 'apartamento' && modal === 'venta';
    else if (filtroActual === 'apartamento-alquiler') show = type === 'apartamento' && modal === 'alquiler';
    card.style.display = show ? '' : 'none';
  });
}

function setupSearch() {
  document.getElementById('searchBtn')?.addEventListener('click', async () => {
    const tipo     = document.getElementById('filterType')?.value  || '';
    const modalidad = document.getElementById('filterModal')?.value || '';
    const precioMax = parseFloat(document.getElementById('filterPrice')?.value) || 0;

    const grid    = document.getElementById('propertiesGrid');
    const loading = document.getElementById('propsLoading');
    const loadBtn = document.getElementById('loadMoreBtn');

    loading?.classList.remove('hidden');
    grid?.querySelectorAll('.prop-card, .no-results').forEach(el => el.remove());
    lastDoc = null;

    try {
      let query = db.collection('propiedades').where('estado', '==', 'disponible');
      if (tipo)      query = query.where('tipo',      '==', tipo);
      if (modalidad) query = query.where('modalidad', '==', modalidad);
      query = query.orderBy('destacada', 'desc').orderBy('creadaEn', 'desc').limit(20);

      const snap = await query.get();
      loading?.classList.add('hidden');

      let props = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (precioMax > 0) props = props.filter(p => p.precio <= precioMax);

      if (!props.length) {
        grid?.insertAdjacentHTML('beforeend', `
          <div class="no-results">
            <span>🔍</span>
            <p>No encontramos propiedades con esos filtros.</p>
            <button class="btn-primary" onclick="cargarPropiedades()" style="margin-top:16px">Ver todas</button>
          </div>`);
        loadBtn?.classList.add('hidden');
        return;
      }

      props.forEach(p => grid?.insertAdjacentHTML('beforeend', crearCardHTML(p)));
      loadBtn?.classList.add('hidden');
      setupFavBtns();
      document.getElementById('propiedades')?.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      loading?.classList.add('hidden');
      console.error(err);
    }
  });
}

// ════════════════════════════════════════
// STATS
// ════════════════════════════════════════

async function actualizarStats() {
  try {
    const snap = await db.collection('propiedades').where('estado', '==', 'disponible').get();
    const props = snap.docs.map(d => d.data());
    const total    = props.length;
    const ventas   = props.filter(p => p.modalidad === 'venta').length;
    const alquileres = props.filter(p => p.modalidad === 'alquiler').length;

    animateCount(document.getElementById('statTotal'),   total);
    animateCount(document.getElementById('statVenta'),   ventas);
    animateCount(document.getElementById('statAlquiler'), alquileres);
  } catch (_) {}
}

function animateCount(el, target, duration = 800) {
  if (!el || target === 0) { if (el) el.textContent = target; return; }
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { el.textContent = target; clearInterval(timer); }
    else el.textContent = Math.floor(start);
  }, 16);
}

// ════════════════════════════════════════
// VIEW TOGGLE
// ════════════════════════════════════════

function setupViewToggle() {
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
}

// ════════════════════════════════════════
// NAVBAR AUTH
// ════════════════════════════════════════

function setupNavbar() {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  window.addEventListener('scroll', () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  hamburger?.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  document.addEventListener('click', (e) => {
    if (mobileMenu?.classList.contains('open') &&
        !mobileMenu.contains(e.target) &&
        !hamburger?.contains(e.target)) {
      cerrarMenu();
    }
  });

  // Avatar dropdown
  document.getElementById('avatarWrap')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('avatarWrap').classList.toggle('open');
  });
  document.addEventListener('click', () => {
    document.getElementById('avatarWrap')?.classList.remove('open');
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await auth.signOut();
  });
  document.getElementById('mobileLogoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    cerrarMenu();
    await auth.signOut();
  });
}

window.cerrarMenu = function() {
  const mobileMenu = document.getElementById('mobileMenu');
  const hamburger  = document.getElementById('hamburger');
  mobileMenu?.classList.remove('open');
  hamburger?.classList.remove('open');
  document.body.style.overflow = '';
};

window.actualizarNavbar = function(user) {
  const authGuest         = document.getElementById('authGuest');
  const authUser          = document.getElementById('authUser');
  const avatarFallback    = document.getElementById('avatarFallback');
  const mobileUserSection = document.getElementById('mobileUserSection');
  const mobileLoggedLinks = document.getElementById('mobileLoggedLinks');
  const mobileGuestBtns   = document.getElementById('mobileGuestBtns');
  const mobileAvatar      = document.getElementById('mobileAvatar');
  const mobileUserName    = document.getElementById('mobileUserName');
  const mobileUserEmail   = document.getElementById('mobileUserEmail');

  if (user) {
    authGuest?.classList.add('hidden');
    authUser?.classList.remove('hidden');
    const ini = (user.displayName || user.email || 'U')[0].toUpperCase();
    if (avatarFallback)  avatarFallback.textContent  = ini;
    if (mobileAvatar)    mobileAvatar.textContent    = ini;
    if (mobileUserName)  mobileUserName.textContent  = user.displayName || 'Mi cuenta';
    if (mobileUserEmail) mobileUserEmail.textContent = user.email || '';
    mobileUserSection?.classList.remove('hidden');
    mobileLoggedLinks?.classList.remove('hidden');
    mobileGuestBtns?.classList.add('hidden');
  } else {
    authGuest?.classList.remove('hidden');
    authUser?.classList.add('hidden');
    mobileUserSection?.classList.add('hidden');
    mobileLoggedLinks?.classList.add('hidden');
    mobileGuestBtns?.classList.remove('hidden');
  }
};

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════

window.cargarPropiedades = cargarPropiedades;

function escapeHtml(t) {
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
