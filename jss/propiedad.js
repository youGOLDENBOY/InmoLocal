/* ═══════════════════════════════════════════════════════════
   InmoLocal — propiedad.js
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

// ─── Demo data (se reemplaza con Firebase) ───
const DEMO_PROP = {
  id: '1',
  tipo: 'casa',
  modalidad: 'venta',
  titulo: 'Casa amplia con patio y garaje en el centro',
  descripcion: `Hermosa casa familiar ubicada en el corazón del pueblo, a solo 3 minutos caminando del parque central y del mercado municipal.\n\nLa propiedad cuenta con amplias habitaciones ventiladas, sala espaciosa, cocina remodelada con gabinetes modernos y patio trasero con jardín bien mantenido. El garaje tiene espacio para dos vehículos.\n\nEl sector es tranquilo, con buena iluminación nocturna y vecinos establecidos desde hace años. Hay acceso fácil a transporte público, colegios, iglesias y colmados.\n\nSe vende con todos los electrodomésticos incluidos. Documentos al día y listos para firma. Precio negociable para compradores serios.`,
  precio: 3500000,
  moneda: 'DOP',
  habitaciones: 3,
  banos: 2,
  metros: 120,
  direccion: 'Calle Duarte #45, Sector Centro',
  referencia: 'A 50 metros del parque central, frente a la farmacia San Rafael',
  amenidades: ['garage', 'patio', 'ac', 'cisterna', 'planta'],
  fotos: [
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'https://images.unsplash.com/photo-1567767292278-a7c22fa7d4f2?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  ],
  videos: [],
  propietarioNombre: 'Juan Pérez',
  propietarioTelefono: '+18095550000',
  propietarioAvatarUrl: '',
  vistas: 47,
  creadaEn: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  estado: 'disponible',
  destacada: false,
};

const AMENIDAD_LABELS = {
  garage:    { icon: '🚗', label: 'Garaje' },
  piscina:   { icon: '🏊', label: 'Piscina' },
  patio:     { icon: '🌿', label: 'Patio/Jardín' },
  balcon:    { icon: '🏙️', label: 'Balcón' },
  amueblado: { icon: '🛋️', label: 'Amueblado' },
  ac:        { icon: '❄️', label: 'Aire acondicionado' },
  seguridad: { icon: '🔒', label: 'Seguridad' },
  planta:    { icon: '⚡', label: 'Planta eléctrica' },
  cisterna:  { icon: '💧', label: 'Cisterna/Tanque' },
  internet:  { icon: '📡', label: 'Internet incluido' },
};

let lbIndex = 0;
let lbFotos = [];
let isFav   = false;

// ─── Cargar propiedad ───
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || '1';

  // CON FIREBASE:
  // const doc = await db.collection('propiedades').doc(id).get();
  // if (!doc.exists) { mostrarError(); return; }
  // const prop = { id: doc.id, ...doc.data() };
  // db.collection('propiedades').doc(id).update({ vistas: firebase.firestore.FieldValue.increment(1) });

  const prop = DEMO_PROP; // DEMO
  renderPropiedad(prop);
});

function renderPropiedad(p) {
  // ─ Mostrar página ─
  $('pageLoading').classList.add('hidden');
  $('propiedadPage').classList.remove('hidden');

  // ─ Meta ─
  document.title = `${p.titulo} — InmoLocal`;

  // ─ Breadcrumb ─
  $('bcTipo').textContent   = p.tipo === 'casa' ? 'Casas' : 'Apartamentos';
  $('bcTitulo').textContent = p.titulo;

  // ─ Header ─
  const badges = $('detailBadges');
  badges.innerHTML = `
    <span class="badge badge-${p.modalidad}">${p.modalidad === 'venta' ? 'En venta' : 'En alquiler'}</span>
    <span class="badge badge-tipo">${p.tipo === 'casa' ? 'Casa' : 'Apartamento'}</span>
    ${p.destacada ? '<span class="badge badge-featured">⭐ Destacada</span>' : ''}
  `;
  $('detailTitulo').textContent  = p.titulo;
  $('detailLocation').textContent = `📍 ${p.direccion}`;

  const precioFmt = p.precio.toLocaleString('es-DO');
  const moneda = p.moneda === 'DOP' ? 'RD$' : 'USD$';
  const sufijo = p.modalidad === 'alquiler' ? '<small style="font-size:18px;font-weight:300">/mes</small>' : '';
  $('detailPrecio').innerHTML = `${moneda} ${precioFmt} ${sufijo}`;

  // ─ Galería ─
  lbFotos = p.fotos || [];
  renderGallery(lbFotos);

  // ─ Quick features ─
  const qf = $('quickFeatures');
  qf.innerHTML = `
    <div class="qf-item"><span class="qf-icon">🛏</span><span class="qf-val">${p.habitaciones}</span><span class="qf-label">Habitaciones</span></div>
    <div class="qf-item"><span class="qf-icon">🚿</span><span class="qf-val">${p.banos}</span><span class="qf-label">Baños</span></div>
    ${p.metros ? `<div class="qf-item"><span class="qf-icon">📐</span><span class="qf-val">${p.metros}</span><span class="qf-label">m²</span></div>` : ''}
    <div class="qf-item"><span class="qf-icon">🏷️</span><span class="qf-val">${p.tipo === 'casa' ? 'Casa' : 'Apto.'}</span><span class="qf-label">Tipo</span></div>
  `;

  // ─ Descripción ─
  $('descText').textContent = p.descripcion;
  if (p.descripcion.length > 400) {
    const desc = $('detailDesc');
    desc.classList.add('collapsed');
    const btn = $('btnReadMore');
    btn.classList.remove('hidden');
    btn.addEventListener('click', () => {
      desc.classList.remove('collapsed');
      btn.classList.add('hidden');
    });
  }

  // ─ Amenidades ─
  if (p.amenidades?.length) {
    const list = $('amenidadesList');
    list.innerHTML = p.amenidades.map(a => {
      const info = AMENIDAD_LABELS[a] || { icon: '✓', label: a };
      return `<div class="amenidad-item"><span class="am-icon">${info.icon}</span>${info.label}</div>`;
    }).join('');
  } else {
    $('amenidadesSection').classList.add('hidden');
  }

  // ─ Videos ─
  if (p.videos?.length) {
    $('videosSection').classList.remove('hidden');
    $('videosGrid').innerHTML = p.videos.map(url => `
      <div class="video-item">
        <video src="${url}" controls playsinline muted></video>
      </div>
    `).join('');
  }

  // ─ Ubicación ─
  $('detailDireccion').textContent = p.direccion;
  if (p.referencia) {
    $('detailReferencia').textContent = p.referencia;
    $('detailReferencia').classList.remove('hidden');
  }
  const mapsQuery = encodeURIComponent(`${p.direccion}, República Dominicana`);
  $('btnGoogleMaps').href = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  // ─ Sidebar & stats ─
  $('sidebarNombre').textContent  = p.propietarioNombre;
  $('sidebarAvatar').textContent  = p.propietarioNombre?.[0]?.toUpperCase() || '?';
  $('sidebarPrecio').innerHTML    = `${moneda} ${precioFmt} ${sufijo}`;
  $('sidebarModalidad').textContent = p.modalidad === 'alquiler' ? 'Precio mensual' : 'Precio de venta';
  $('statVistas').textContent     = p.vistas || 0;
  $('statFechaRel').textContent   = tiempoRelativo(p.creadaEn);

  // ─ WhatsApp ─
  const msg = encodeURIComponent(`Hola ${p.propietarioNombre}, vi tu propiedad "${p.titulo}" en InmoLocal y me interesa. ¿Podemos hablar?`);
  const tel = (p.propietarioTelefono || '').replace(/\D/g, '');
  $('btnWppSidebar').href = `https://wa.me/${tel}?text=${msg}`;

  // ─ Fav button ─
  $('btnFavLg')?.addEventListener('click', toggleFav);
}

// ─── Galería ───
function renderGallery(fotos) {
  const wrap = $('galleryWrap');
  if (!fotos.length) {
    wrap.innerHTML = '<div class="gallery-placeholder"><span>📸 Sin fotos disponibles</span></div>';
    return;
  }

  const count = fotos.length;
  const cls   = count >= 4 ? 'g-4plus' : `g-${Math.min(count, 3)}`;
  const max   = Math.min(count, 4);

  let html = `<div class="gallery-grid ${cls}">`;
  fotos.slice(0, max).forEach((url, i) => {
    const isMain  = i === 0;
    const isLast  = i === max - 1;
    const more    = count - max;
    html += `<div class="gallery-item ${isMain ? 'main' : 'sub'}" onclick="abrirLightbox(${i})">
      <img src="${url}" alt="Foto ${i+1}" loading="${i === 0 ? 'eager' : 'lazy'}">
      ${isLast && more > 0 ? `<div class="gallery-more-overlay">+${more} fotos</div>` : ''}
    </div>`;
  });
  html += '</div>';
  wrap.innerHTML = html;
}

// ─── Lightbox ───
function abrirLightbox(index) {
  lbIndex = index;
  $('lightbox').classList.remove('hidden');
  renderLb();
  document.addEventListener('keydown', lbKeyHandler);
}

function cerrarLightbox() {
  $('lightbox').classList.add('hidden');
  document.removeEventListener('keydown', lbKeyHandler);
}

function renderLb() {
  const url = lbFotos[lbIndex];
  $('lbContent').innerHTML = `<img src="${url}" alt="Foto ${lbIndex + 1}">`;
  $('lbCounter').textContent = `${lbIndex + 1} / ${lbFotos.length}`;
}

function lbKeyHandler(e) {
  if (e.key === 'ArrowRight') { lbIndex = (lbIndex + 1) % lbFotos.length; renderLb(); }
  if (e.key === 'ArrowLeft')  { lbIndex = (lbIndex - 1 + lbFotos.length) % lbFotos.length; renderLb(); }
  if (e.key === 'Escape')     cerrarLightbox();
}

$('lbClose')?.addEventListener('click', cerrarLightbox);
$('lbNext')?.addEventListener('click', () => { lbIndex = (lbIndex + 1) % lbFotos.length; renderLb(); });
$('lbPrev')?.addEventListener('click', () => { lbIndex = (lbIndex - 1 + lbFotos.length) % lbFotos.length; renderLb(); });

// Cerrar al hacer click fuera
$('lightbox')?.addEventListener('click', (e) => { if (e.target === $('lightbox')) cerrarLightbox(); });

// ─── Favoritos ───
function toggleFav() {
  isFav = !isFav;
  const btn = $('btnFavLg');
  $('favIcon').textContent = isFav ? '♥' : '♡';
  btn.textContent = isFav ? '♥ Guardado' : '♡ Guardar';
  btn.classList.toggle('active', isFav);
  // CON FIREBASE: guardar en /favoritos/{userId}/lista/{propiedadId}
}

// ─── Chat ───
function abrirChat() {
  // CON FIREBASE: verificar auth.currentUser, si no → mostrar modal login
  $('modalLogin').classList.remove('hidden');
  // Si logueado: window.location.href = `chat.html?prop=${propId}&vendor=${vendorId}`;
}

// ─── Compartir ───
$('btnShare')?.addEventListener('click', async () => {
  if (navigator.share) {
    await navigator.share({ title: document.title, url: window.location.href });
  } else {
    await navigator.clipboard.writeText(window.location.href);
    $('btnShare').textContent = '✓ Enlace copiado';
    setTimeout(() => $('btnShare').textContent = '🔗 Compartir', 2000);
  }
});

// ─── Tiempo relativo ───
function tiempoRelativo(fecha) {
  if (!fecha) return '—';
  const d = fecha instanceof Date ? fecha : fecha.toDate?.() || new Date(fecha);
  const diff = Date.now() - d.getTime();
  const dias = Math.floor(diff / 86400000);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7)  return `hace ${dias} días`;
  if (dias < 30) return `hace ${Math.floor(dias/7)} semanas`;
  return `hace ${Math.floor(dias/30)} meses`;
}

window.abrirLightbox = abrirLightbox;
window.abrirChat = abrirChat;
