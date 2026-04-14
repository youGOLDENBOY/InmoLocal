/* ═══════════════════════════════════════════════════════════
   InmoLocal — buscar.js
   Página de búsqueda avanzada con filtros: precio, hab., metros,
   amenidades, tipo, modalidad + ordenamiento + paginación
═══════════════════════════════════════════════════════════ */

const WPP_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

const $ = id => document.getElementById(id);

let todasLasProps  = [];   // Resultados actuales sin paginar
let propsMostradas = 0;    // Cuántas se muestran
let favoritosIds   = [];
const POR_PAGINA   = 12;

// ─── Filtros actuales ───
let filtros = {
  tipo:        '',
  modalidad:   '',
  precioMin:   0,
  precioMax:   Infinity,
  habitaciones: 0,
  banos:        0,
  metros:       0,
  amenidad:    '',
  orden:       'reciente',
};

// ════════════════════════════════════════
// INIT
// ════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  setupChips();
  setupNumSelectors();
  setupEventos();
  setupNavbarBuscar();

  // Si viene con parámetros en la URL, pre-llenar filtros
  const params = new URLSearchParams(window.location.search);
  if (params.get('tipo'))     { $('fTipo').value     = params.get('tipo');     filtros.tipo     = params.get('tipo'); }
  if (params.get('modalidad')){ $('fModalidad').value = params.get('modalidad'); filtros.modalidad = params.get('modalidad'); }
  if (params.get('q'))        { /* búsqueda por texto — implementación futura */ }

  // Sincronizar chips con parámetros
  sincronizarChipsConSelects();

  buscar();

  // Favoritos
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try { favoritosIds = await obtenerFavoritos(); } catch (_) {}
    }
  });
});

// ════════════════════════════════════════
// SETUP EVENTOS
// ════════════════════════════════════════

function setupEventos() {
  $('btnBuscar')?.addEventListener('click', buscar);
  $('btnLimpiar')?.addEventListener('click', limpiarFiltros);
  $('ordenSelect')?.addEventListener('change', () => {
    filtros.orden = $('ordenSelect').value;
    ordenarYRenderizar();
  });
  $('loadMoreBuscar')?.addEventListener('click', mostrarMas);

  // Enter en inputs dispara búsqueda
  ['fPrecioMin','fPrecioMax','fMetros'].forEach(id => {
    $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
  });

  // Sync selects → chips
  $('fTipo')?.addEventListener('change',     sincronizarChipsConSelects);
  $('fModalidad')?.addEventListener('change', sincronizarChipsConSelects);
}

// ─── Chips de tipo rápido ───
function setupChips() {
  document.querySelectorAll('.tipo-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.tipo-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      // Actualizar selects
      if ($('fTipo'))      $('fTipo').value      = chip.dataset.tipo    || '';
      if ($('fModalidad')) $('fModalidad').value = chip.dataset.modal   || '';
      buscar();
    });
  });
}

function sincronizarChipsConSelects() {
  const tipo  = $('fTipo')?.value      || '';
  const modal = $('fModalidad')?.value || '';
  document.querySelectorAll('.tipo-chips .chip').forEach(chip => {
    const match = chip.dataset.tipo === tipo && chip.dataset.modal === modal;
    const isAll = chip.dataset.tipo === '' && chip.dataset.modal === '';
    chip.classList.toggle('active', match || (isAll && !tipo && !modal));
  });
}

// ─── Selectores numéricos (hab. y baños) ───
function setupNumSelectors() {
  setupNumSelector('habSelector',   'fHabitaciones');
  setupNumSelector('banosSelector', 'fBanos');
}

function setupNumSelector(selectorId, inputId) {
  const selector = $(selectorId);
  if (!selector) return;
  selector.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selector.querySelectorAll('.num-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const input = $(inputId);
      if (input) input.value = btn.dataset.val;
    });
  });
}

// ════════════════════════════════════════
// BUSCAR — leer filtros y consultar Firebase
// ════════════════════════════════════════

async function buscar() {
  // Leer filtros del formulario
  filtros.tipo         = $('fTipo')?.value         || '';
  filtros.modalidad    = $('fModalidad')?.value    || '';
  filtros.precioMin    = parseFloat($('fPrecioMin')?.value)  || 0;
  filtros.precioMax    = parseFloat($('fPrecioMax')?.value)  || Infinity;
  filtros.habitaciones = parseInt($('fHabitaciones')?.value) || 0;
  filtros.banos        = parseInt($('fBanos')?.value)        || 0;
  filtros.metros       = parseFloat($('fMetros')?.value)     || 0;
  filtros.amenidad     = $('fAmenidad')?.value               || '';
  filtros.orden        = $('ordenSelect')?.value             || 'reciente';

  mostrarLoading();

  try {
    // Firestore: query base (solo campos indexados)
    let query = db.collection('propiedades').where('estado', '==', 'disponible');

    if (filtros.tipo)     query = query.where('tipo',     '==', filtros.tipo);
    if (filtros.modalidad) query = query.where('modalidad', '==', filtros.modalidad);

    // Ordenamiento en Firestore (necesita índice compuesto)
    query = query.orderBy('destacada', 'desc').orderBy('creadaEn', 'desc').limit(200);

    const snap = await query.get();
    let props  = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // ── Filtros client-side (precio, hab., metros, amenidades) ──
    props = props.filter(p => {
      const precio = p.precio || 0;
      if (precio < filtros.precioMin)  return false;
      if (precio > filtros.precioMax)  return false;
      if ((p.habitaciones || 0) < filtros.habitaciones) return false;
      if ((p.banos         || 0) < filtros.banos)       return false;
      if ((p.metros        || 0) < filtros.metros && filtros.metros > 0) return false;
      if (filtros.amenidad && !p.amenidades?.includes(filtros.amenidad)) return false;
      return true;
    });

    todasLasProps  = props;
    propsMostradas = 0;

    ordenarYRenderizar();

  } catch (err) {
    console.error('Error en búsqueda:', err);
    mostrarError(err.message);
  }
}

// ════════════════════════════════════════
// ORDENAR Y RENDERIZAR
// ════════════════════════════════════════

function ordenarYRenderizar() {
  const props = [...todasLasProps];

  switch (filtros.orden) {
    case 'precio-asc':
      props.sort((a, b) => (a.precio || 0) - (b.precio || 0));
      break;
    case 'precio-desc':
      props.sort((a, b) => (b.precio || 0) - (a.precio || 0));
      break;
    case 'destacadas':
      props.sort((a, b) => (b.destacada ? 1 : 0) - (a.destacada ? 1 : 0));
      break;
    // 'reciente' — ya viene ordenado de Firebase
  }

  todasLasProps  = props;
  propsMostradas = 0;

  const grid = $('resultadosGrid');
  if (grid) grid.innerHTML = '';

  actualizarContador();

  if (!props.length) {
    mostrarVacio();
    return;
  }

  mostrarMas();
}

function mostrarMas() {
  const grid  = $('resultadosGrid');
  const slice = todasLasProps.slice(propsMostradas, propsMostradas + POR_PAGINA);

  slice.forEach(p => {
    grid.insertAdjacentHTML('beforeend', crearCardHTML(p));
  });

  propsMostradas += slice.length;

  // Botón "cargar más"
  const btn = $('loadMoreBuscar');
  if (btn) {
    btn.classList.toggle('hidden', propsMostradas >= todasLasProps.length);
  }

  setupFavBtnsBuscar();
}

// ════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════

function mostrarLoading() {
  const grid = $('resultadosGrid');
  if (grid) grid.innerHTML = `
    <div class="buscar-loading">
      <div class="spin"></div>
      <span>Buscando propiedades...</span>
    </div>`;
  $('loadMoreBuscar')?.classList.add('hidden');
}

function mostrarVacio() {
  const grid = $('resultadosGrid');
  if (grid) grid.innerHTML = `
    <div class="buscar-empty">
      <div class="empty-icon">🏠</div>
      <h3>Sin resultados</h3>
      <p>No encontramos propiedades con esos filtros.<br>Intenta ampliar tu búsqueda.</p>
      <button class="btn-primary" onclick="limpiarFiltros()">Ver todas las propiedades</button>
    </div>`;
}

function mostrarError(msg) {
  const grid = $('resultadosGrid');
  if (grid) grid.innerHTML = `
    <div class="buscar-empty">
      <div class="empty-icon">⚠️</div>
      <h3>Error al buscar</h3>
      <p>${msg}</p>
      <button class="btn-primary" onclick="buscar()">Reintentar</button>
    </div>`;
}

function actualizarContador() {
  const num = $('numResultados');
  if (num) num.textContent = todasLasProps.length;
}

function limpiarFiltros() {
  $('fTipo').value      = '';
  $('fModalidad').value = '';
  $('fPrecioMin').value = '';
  $('fPrecioMax').value = '';
  $('fMetros').value    = '';
  $('fAmenidad').value  = '';
  $('fHabitaciones').value = '0';
  $('fBanos').value        = '0';
  $('ordenSelect').value   = 'reciente';

  // Reset num buttons
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === '0');
  });

  // Reset chips
  document.querySelectorAll('.tipo-chips .chip').forEach((chip, i) => {
    chip.classList.toggle('active', i === 0);
  });

  filtros = {
    tipo: '', modalidad: '', precioMin: 0, precioMax: Infinity,
    habitaciones: 0, banos: 0, metros: 0, amenidad: '', orden: 'reciente',
  };

  buscar();
}

// ════════════════════════════════════════
// CARD HTML
// ════════════════════════════════════════

function crearCardHTML(p) {
  const moneda = p.moneda === 'USD' ? 'USD$' : 'RD$';
  const precio = (p.precio || 0).toLocaleString('es-DO');
  const sufijo = p.modalidad === 'alquiler' ? '<small>/mes</small>' : '';
  const isFav  = favoritosIds.includes(p.id);
  const ini    = (p.propietarioNombre || 'P')[0].toUpperCase();

  const imgHTML = p.fotos?.length
    ? `<img src="${p.fotos[0]}" alt="${escapeHtml(p.titulo)}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
    : `<div class="prop-img-placeholder">${p.tipo === 'casa' ? '🏠' : '🏢'}</div>`;

  const tel    = (p.propietarioTelefono || '').replace(/\D/g, '');
  const wppMsg = encodeURIComponent(`Hola ${p.propietarioNombre}, vi tu propiedad "${p.titulo}" en InmoLocal y me interesa.`);
  const wppBtn = tel
    ? `<a href="https://wa.me/${tel}?text=${wppMsg}" class="btn-wpp" target="_blank" rel="noopener" title="WhatsApp">${WPP_SVG}</a>`
    : '';

  return `
    <article class="prop-card${p.destacada ? ' featured' : ''}" data-id="${p.id}">
      <div class="prop-img-wrap">
        ${imgHTML}
        <div class="prop-badges">
          <span class="badge badge-${p.modalidad}">${p.modalidad === 'venta' ? 'Venta' : 'Alquiler'}</span>
          <span class="badge badge-tipo">${p.tipo === 'casa' ? 'Casa' : 'Apartamento'}</span>
          ${p.destacada ? '<span class="badge badge-featured">⭐ Destacada</span>' : ''}
        </div>
        <button class="fav-btn${isFav ? ' active' : ''}" data-id="${p.id}" title="Guardar">
          ${isFav ? '♥' : '♡'}
        </button>
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
// FAVORITOS en página de búsqueda
// ════════════════════════════════════════

function setupFavBtnsBuscar() {
  document.querySelectorAll('#resultadosGrid .fav-btn[data-id]').forEach(btn => {
    // Evitar duplicar listeners
    const clone = btn.cloneNode(true);
    btn.replaceWith(clone);
  });

  document.querySelectorAll('#resultadosGrid .fav-btn[data-id]').forEach(btn => {
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
// NAVBAR mínimo para buscar.html
// ════════════════════════════════════════

function setupNavbarBuscar() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 20);
  });

  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('hamburger')?.classList.toggle('active');
  });
}

// ════════════════════════════════════════
// HELPER
// ════════════════════════════════════════

function escapeHtml(t) {
  return (t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
