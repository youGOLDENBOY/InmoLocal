/* ═══════════════════════════════════════════════════════════
   InmoLocal — main.js v4
   Carga propiedades reales de Firebase · Filtros · Auth nav
   + Anuncios dinámicos desde Firestore
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

  cargarPropiedades();
  cargarAnunciosBanner();
  cargarAnunciosSección();

  auth.onAuthStateChanged(async (user) => {
    actualizarNavbar(user);
    if (user) {
      try { favoritosIds = await obtenerFavoritos(); } catch (_) {}
    } else {
      favoritosIds = [];
    }
  });

  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    cargarPropiedades(true);
  });
});

// ════════════════════════════════════════
// ANUNCIOS — BANNER SUPERIOR
// ════════════════════════════════════════

async function cargarAnunciosBanner() {
  try {
    const anuncios = await obtenerAnuncios('banner-top');
    const banner   = document.getElementById('adBannerTop');
    const content  = document.getElementById('adContent');
    if (!banner || !content) return;

    if (!anuncios.length) {
      // Sin anuncios activos: ocultar banner
      banner.style.display = 'none';
      return;
    }

    // Mostrar el primer anuncio activo (o rotar si hay varios)
    const ad = anuncios[0];
    content.innerHTML = `
      <a href="${ad.linkDestino || '#'}" class="ad-real" target="_blank" rel="noopener"
         onclick="registrarClickAnuncio('${ad.id}')">
        ${ad.imagenUrl
          ? `<img src="${ad.imagenUrl}" alt="${ad.nombre}" class="ad-banner-img">`
          : `<div class="ad-placeholder-img">${ad.emoji || '📢'}</div>`
        }
        <div class="ad-placeholder-text">
          <strong>${ad.nombre}</strong>
          <span>${ad.texto || 'Haz clic para saber más'}</span>
        </div>
      </a>`;

    // Si hay varios, rotar cada 5 segundos
    if (anuncios.length > 1) {
      let idx = 0;
      setInterval(() => {
        idx = (idx + 1) % anuncios.length;
        const a = anuncios[idx];
        content.innerHTML = `
          <a href="${a.linkDestino || '#'}" class="ad-real" target="_blank" rel="noopener"
             onclick="registrarClickAnuncio('${a.id}')">
            ${a.imagenUrl
              ? `<img src="${a.imagenUrl}" alt="${a.nombre}" class="ad-banner-img">`
              : `<div class="ad-placeholder-img">${a.emoji || '📢'}</div>`
            }
            <div class="ad-placeholder-text">
              <strong>${a.nombre}</strong>
              <span>${a.texto || ''}</span>
            </div>
          </a>`;
      }, 5000);
    }
  } catch (err) {
    console.error('Error cargando banner:', err);
  }
}

// ════════════════════════════════════════
// ANUNCIOS — SECCIÓN INFERIOR
// ════════════════════════════════════════

async function cargarAnunciosSección() {
  try {
    // La sección usa posición 'seccion-anuncios' en Firestore
    // También puede venir de 'en-grid' y 'sidebar'
    const [enSeccion, enGrid] = await Promise.all([
      obtenerAnuncios('seccion-anuncios'),
      obtenerAnuncios('en-grid'),
    ]);

    const todos = [...enSeccion, ...enGrid];
    if (!todos.length) return;

    const grid = document.querySelector('.ads-grid');
    if (!grid) return;

    // Limpiar los demo cards y poner los reales
    grid.innerHTML = '';
    todos.forEach(ad => {
      const div = document.createElement('div');
      div.className = 'ad-full-card';
      div.innerHTML = `
        <div class="ad-full-img">${ad.emoji || '📢'}</div>
        <div class="ad-full-body">
          <span class="ad-label">Anuncio</span>
          <h3>${ad.nombre}</h3>
          <p>${ad.texto || ''}</p>
          <a href="${ad.linkDestino || '#'}" class="btn-primary" target="_blank" rel="noopener"
             onclick="registrarClickAnuncio('${ad.id}')">Ver más</a>
        </div>`;
      grid.appendChild(div);
    });
  } catch (err) {
    console.error('Error cargando sección anuncios:', err);
  }
}

// ════════════════════════════════════════
// CARGAR PROPIEDADES DESDE FIREBASE
// ════════════════════════════════════════

async function cargarPropiedades(append = false) {
  const grid    = document.getElementById('propertiesGrid');
  const loading = document.getElementById('propsLoading');
  const loadBtn = document.getElementById('loadMoreBtn');

  if (!append) {
    loading?.classList.remove('hidden');
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

    props.forEach(p => {
      grid?.insertAdjacentHTML('beforeend', crearCardHTML(p));
    });

    actualizarStats();

    if (snap.docs.length < POR_PAGINA) {
      loadBtn?.classList.add('hidden');
    } else {
      loadBtn?.classList.remove('hidden');
    }

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
  const moneda = p.moneda === 'USD' ? 'USD$' : 'RD$';
  const precio = (p.precio || 0).toLocaleString('es-DO');
  const sufijo = p.modalidad === 'alquiler' ? '<small>/mes</small>' : '';
  const isFav  = favoritosIds.includes(p.id);
  const ini    = (p.propietarioNombre || 'P')[0].toUpperCase();

  let imgHTML = p.fotos?.length
    ? `<img src="${p.fotos[0]}" alt="${p.titulo}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
    : `<div class="prop-img-placeholder">${p.tipo === 'casa' ? '🏠' : '🏢'}</div>`;

  const tel    = (p.propietarioTelefono || '').replace(/\D/g, '');
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
        btn.classList.add('active'); btn.textContent = '♥';
        if (!favoritosIds.includes(id)) favoritosIds.push(id);
      } else {
        btn.classList.remove('active'); btn.textContent = '♡';
        favoritosIds = favoritosIds.filter(x => x !== id);
      }
    });
  });
}

// ════════════════════════════════════════
// FILTROS Y BÚSQUEDA
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
  document.querySelectorAll('.prop-card').forEach(card => {
    if (filtroActual === 'todo') {
      card.style.display = '';
      return;
    }
    const [tipo, modal] = filtroActual.split('-');
    const match = card.dataset.type === tipo && card.dataset.modal === modal;
    card.style.display = match ? '' : 'none';
  });
}

function setupSearch() {
  const btn = document.getElementById('searchBtn');
  btn?.addEventListener('click', () => {
    const tipo    = document.getElementById('filterType')?.value;
    const modal   = document.getElementById('filterModal')?.value;
    const precioMax = parseFloat(document.getElementById('filterPrice')?.value) || Infinity;

    document.querySelectorAll('.prop-card').forEach(card => {
      const id   = card.dataset.id;
      const prop = todasLasPropiedades.find(p => p.id === id);
      if (!prop) { card.style.display = 'none'; return; }

      const okTipo  = !tipo  || prop.tipo === tipo;
      const okModal = !modal || prop.modalidad === modal;
      const okPrice = prop.precio <= precioMax;

      card.style.display = (okTipo && okModal && okPrice) ? '' : 'none';
    });
  });
}

// ════════════════════════════════════════
// NAVBAR
// ════════════════════════════════════════

function setupNavbar() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu?.classList.toggle('open');
  });

  // Cerrar al hacer scroll
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    navbar?.classList.toggle('scrolled', window.scrollY > 20);
  });
}

window.cerrarMenu = function() {
  document.getElementById('mobileMenu')?.classList.remove('open');
  document.getElementById('hamburger')?.classList.remove('active');
};

function actualizarNavbar(user) {
  const mobileUserSection = document.getElementById('mobileUserSection');
  const mobileUserName    = document.getElementById('mobileUserName');
  const mobileUserEmail   = document.getElementById('mobileUserEmail');
  const mobileLoggedLinks = document.getElementById('mobileLoggedLinks');
  const mobileGuestBtns   = document.getElementById('mobileGuestBtns');

  if (user) {
    mobileUserSection?.classList.remove('hidden');
    mobileLoggedLinks?.classList.remove('hidden');
    mobileGuestBtns?.classList.add('hidden');
    if (mobileUserName)  mobileUserName.textContent  = user.displayName || 'Usuario';
    if (mobileUserEmail) mobileUserEmail.textContent = user.email;

    const mobileAv = document.getElementById('mobileAvatar');
    if (mobileAv) mobileAv.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();

    document.getElementById('mobileLogoutBtn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await auth.signOut();
      window.location.href = 'index.html';
    });
  } else {
    mobileUserSection?.classList.add('hidden');
    mobileLoggedLinks?.classList.add('hidden');
    mobileGuestBtns?.classList.remove('hidden');
  }
}

// ════════════════════════════════════════
// VIEW TOGGLE (grid / list)
// ════════════════════════════════════════

function setupViewToggle() {
  document.getElementById('viewGrid')?.addEventListener('click', () => {
    document.getElementById('propertiesGrid')?.classList.remove('view-list');
    document.getElementById('viewGrid')?.classList.add('active');
    document.getElementById('viewList')?.classList.remove('active');
  });
  document.getElementById('viewList')?.addEventListener('click', () => {
    document.getElementById('propertiesGrid')?.classList.add('view-list');
    document.getElementById('viewList')?.classList.add('active');
    document.getElementById('viewGrid')?.classList.remove('active');
  });
}

// ════════════════════════════════════════
// STATS
// ════════════════════════════════════════

async function actualizarStats() {
  try {
    const snap = await db.collection('propiedades').where('estado', '==', 'disponible').get();
    const props = snap.docs.map(d => d.data());
    document.getElementById('statTotal')?.(el => el.textContent = props.length);
    let venta = 0, alquiler = 0;
    props.forEach(p => { p.modalidad === 'venta' ? venta++ : alquiler++; });
    const st = document.getElementById('statTotal');
    const sv = document.getElementById('statVenta');
    const sa = document.getElementById('statAlquiler');
    if (st) st.textContent = props.length;
    if (sv) sv.textContent = venta;
    if (sa) sa.textContent = alquiler;
  } catch (_) {}
}

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════

function escapeHtml(t) {
  return (t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
