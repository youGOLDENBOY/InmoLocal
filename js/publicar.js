/* ═══════════════════════════════════════════════════════════
   InmoLocal — propiedad.js — Firebase real
   + SEO dinámico: title, description, Open Graph para Google/WhatsApp
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

let lbIndex  = 0;
let lbFotos  = [];
let isFav    = false;
let propData = null;

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

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');

  if (!id) { mostrarError('No se especificó una propiedad.'); return; }

  try {
    const prop = await obtenerPropiedad(id);
    if (!prop) { mostrarError('Esta propiedad no existe o fue eliminada.'); return; }
    propData = prop;

    // ── SEO: inyectar meta tags dinámicos ──
    inyectarMetaTags(prop);

    renderPropiedad(prop);

    auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const favs = await obtenerFavoritos();
      isFav = favs.includes(id);
      actualizarBtnFav();
    });

  } catch (err) {
    console.error(err);
    mostrarError('Error cargando la propiedad.');
  }
});

// ════════════════════════════════════════
// SEO — META TAGS DINÁMICOS
// ════════════════════════════════════════

function inyectarMetaTags(p) {
  const moneda    = p.moneda === 'DOP' ? 'RD$' : 'USD$';
  const precio    = (p.precio || 0).toLocaleString('es-DO');
  const sufijo    = p.modalidad === 'alquiler' ? '/mes' : '';
  const tipoLabel = p.tipo === 'casa' ? 'Casa' : 'Apartamento';
  const modLabel  = p.modalidad === 'venta' ? 'en venta' : 'en alquiler';
  const pageUrl   = window.location.href;

  // Descripción rica para Google / WhatsApp
  const features = [
    p.habitaciones ? `${p.habitaciones} hab.` : null,
    p.banos        ? `${p.banos} baños`        : null,
    p.metros       ? `${p.metros} m²`          : null,
  ].filter(Boolean).join(' · ');

  const description = [
    `${tipoLabel} ${modLabel} en ${p.direccion}.`,
    features ? `${features}.` : '',
    `Precio: ${moneda} ${precio}${sufijo}.`,
    p.descripcion ? p.descripcion.slice(0, 120) + '...' : '',
  ].filter(Boolean).join(' ').trim();

  const imageUrl = p.fotos?.[0] || 'https://proyectotenshi.firebaseapp.com/og-default.jpg';
  const fullTitle = `${p.titulo} — ${moneda} ${precio}${sufijo} | InmoLocal`;

  // ── <title> ──
  document.title = fullTitle;

  // ── Helper: setMeta(name, content, attr) ──
  const setMeta = (attr, key, val) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', val);
  };

  // ── Standard SEO ──
  setMeta('name', 'description', description);
  setMeta('name', 'robots',      'index, follow');

  // ── Open Graph (Facebook, WhatsApp, Telegram) ──
  setMeta('property', 'og:type',        'article');
  setMeta('property', 'og:title',       fullTitle);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:image',       imageUrl);
  setMeta('property', 'og:image:width',  '1200');
  setMeta('property', 'og:image:height', '630');
  setMeta('property', 'og:url',         pageUrl);
  setMeta('property', 'og:site_name',   'InmoLocal');
  setMeta('property', 'og:locale',      'es_DO');

  // ── Twitter Card ──
  setMeta('name', 'twitter:card',        'summary_large_image');
  setMeta('name', 'twitter:title',       fullTitle);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image',       imageUrl);

  // ── Canonical URL ──
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = pageUrl;

  // ── JSON-LD — Schema.org RealEstateListing ──
  const schema = {
    '@context': 'https://schema.org',
    '@type':    'RealEstateListing',
    'name':     p.titulo,
    'description': p.descripcion || description,
    'url':      pageUrl,
    'image':    p.fotos || [],
    'offers': {
      '@type':         'Offer',
      'price':         p.precio,
      'priceCurrency': p.moneda === 'DOP' ? 'DOP' : 'USD',
      'availability':  'https://schema.org/InStock',
    },
    'address': {
      '@type':           'PostalAddress',
      'streetAddress':   p.direccion,
      'addressCountry':  'DO',
    },
    'numberOfRooms': p.habitaciones,
    'floorSize': p.metros ? {
      '@type': 'QuantitativeValue',
      'value': p.metros,
      'unitCode': 'MTK'
    } : undefined,
  };

  let ldScript = document.getElementById('ld-json-propiedad');
  if (!ldScript) {
    ldScript    = document.createElement('script');
    ldScript.id = 'ld-json-propiedad';
    ldScript.type = 'application/ld+json';
    document.head.appendChild(ldScript);
  }
  ldScript.textContent = JSON.stringify(schema);
}

// ════════════════════════════════════════
// RENDER
// ════════════════════════════════════════

function mostrarError(msg) {
  $('pageLoading').innerHTML = `<p style="color:var(--error);font-size:16px">⚠️ ${msg}</p>
    <a href="index.html" class="btn-primary" style="margin-top:20px">Volver al inicio</a>`;
}

function renderPropiedad(p) {
  $('pageLoading').classList.add('hidden');
  $('propiedadPage').classList.remove('hidden');

  $('bcTipo').textContent = p.tipo === 'casa' ? 'Casas' : 'Apartamentos';
  $('bcTitulo').textContent = p.titulo;

  const moneda = p.moneda === 'DOP' ? 'RD$' : 'USD$';
  const fmt    = (p.precio || 0).toLocaleString('es-DO');
  const sufijo = p.modalidad === 'alquiler' ? '<small style="font-size:16px;font-weight:300">/mes</small>' : '';

  $('detailBadges').innerHTML = `
    <span class="badge badge-${p.modalidad}">${p.modalidad === 'venta' ? 'En venta' : 'En alquiler'}</span>
    <span class="badge badge-tipo">${p.tipo === 'casa' ? 'Casa' : 'Apartamento'}</span>
    ${p.destacada ? '<span class="badge badge-featured">⭐ Destacada</span>' : ''}`;

  $('detailTitulo').textContent = p.titulo;
  $('detailLocation').textContent = `📍 ${p.direccion}`;
  $('detailPrecio').innerHTML = `${moneda} ${fmt} ${sufijo}`;

  // Galería
  lbFotos = p.fotos || [];
  renderGallery(lbFotos);

  // Quick features
  $('quickFeatures').innerHTML = `
    <div class="qf-item"><span class="qf-icon">🛏</span><span class="qf-val">${p.habitaciones}</span><span class="qf-label">Habitaciones</span></div>
    <div class="qf-item"><span class="qf-icon">🚿</span><span class="qf-val">${p.banos}</span><span class="qf-label">Baños</span></div>
    ${p.metros ? `<div class="qf-item"><span class="qf-icon">📐</span><span class="qf-val">${p.metros}</span><span class="qf-label">m²</span></div>` : ''}
    <div class="qf-item"><span class="qf-icon">🏷️</span><span class="qf-val">${p.tipo === 'casa' ? 'Casa' : 'Apto.'}</span><span class="qf-label">Tipo</span></div>`;

  // Descripción
  $('descText').textContent = p.descripcion || '';
  if ((p.descripcion || '').length > 400) {
    $('detailDesc').classList.add('collapsed');
    const btn = $('btnReadMore');
    btn.classList.remove('hidden');
    btn.addEventListener('click', () => { $('detailDesc').classList.remove('collapsed'); btn.classList.add('hidden'); });
  }

  // Amenidades
  if (p.amenidades?.length) {
    $('amenidadesList').innerHTML = p.amenidades.map(a => {
      const info = AMENIDAD_LABELS[a] || { icon: '✓', label: a };
      return `<div class="amenidad-item"><span class="am-icon">${info.icon}</span>${info.label}</div>`;
    }).join('');
  } else {
    $('amenidadesSection').classList.add('hidden');
  }

  // Videos
  if (p.videos?.length) {
    $('videosSection').classList.remove('hidden');
    $('videosGrid').innerHTML = p.videos.map(url =>
      `<div class="video-item"><video src="${url}" controls playsinline muted></video></div>`
    ).join('');
  }

  // Ubicación
  $('detailDireccion').textContent = p.direccion;
  if (p.referencia) {
    $('detailReferencia').textContent = p.referencia;
    $('detailReferencia').classList.remove('hidden');
  }
  $('btnGoogleMaps').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.direccion + ', República Dominicana')}`;

  // Sidebar
  $('sidebarNombre').textContent  = p.propietarioNombre || '—';
  $('sidebarAvatar').textContent  = (p.propietarioNombre || 'U')[0].toUpperCase();
  $('sidebarPrecio').innerHTML    = `${moneda} ${fmt} ${sufijo}`;
  $('sidebarModalidad').textContent = p.modalidad === 'alquiler' ? 'Precio mensual' : 'Precio de venta';
  $('statVistas').textContent     = p.vistas || 0;
  $('statFechaRel').textContent   = tiempoRelativo(p.creadaEn?.toDate?.() || new Date(p.creadaEn));

  // WhatsApp
  if (p.propietarioTelefono) {
    const tel = p.propietarioTelefono.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hola ${p.propietarioNombre}, vi tu propiedad "${p.titulo}" en InmoLocal y me interesa.`);
    $('btnWppSidebar').href = `https://wa.me/${tel}?text=${msg}`;
  } else {
    $('btnWppSidebar').style.display = 'none';
  }

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
  let html    = `<div class="gallery-grid ${cls}">`;

  fotos.slice(0, max).forEach((url, i) => {
    const isMain = i === 0, isLast = i === max - 1, more = count - max;
    html += `<div class="gallery-item ${isMain ? 'main' : 'sub'}" onclick="abrirLightbox(${i})">
      <img src="${url}" alt="Foto ${i+1}" loading="${i===0?'eager':'lazy'}">
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
  $('lbContent').innerHTML = `<img src="${lbFotos[lbIndex]}" alt="Foto ${lbIndex+1}">`;
  $('lbCounter').textContent = `${lbIndex+1} / ${lbFotos.length}`;
}

function lbKeyHandler(e) {
  if (e.key === 'ArrowRight') { lbIndex = (lbIndex+1) % lbFotos.length; renderLb(); }
  if (e.key === 'ArrowLeft')  { lbIndex = (lbIndex-1+lbFotos.length) % lbFotos.length; renderLb(); }
  if (e.key === 'Escape')     cerrarLightbox();
}

$('lbClose')?.addEventListener('click', cerrarLightbox);
$('lbNext')?.addEventListener('click',  () => { lbIndex = (lbIndex+1) % lbFotos.length; renderLb(); });
$('lbPrev')?.addEventListener('click',  () => { lbIndex = (lbIndex-1+lbFotos.length) % lbFotos.length; renderLb(); });
$('lightbox')?.addEventListener('click', e => { if (e.target === $('lightbox')) cerrarLightbox(); });

// ─── Favoritos ───

async function toggleFav() {
  const user = auth.currentUser;
  if (!user) { $('modalLogin').classList.remove('hidden'); return; }
  const params = new URLSearchParams(window.location.search);
  isFav = await toggleFavorito(params.get('id'));
  actualizarBtnFav();
}

function actualizarBtnFav() {
  const btn = $('btnFavLg');
  if (!btn) return;
  btn.innerHTML = isFav ? '♥ Guardado' : '♡ Guardar';
  btn.classList.toggle('active', isFav);
}

// ─── Chat ───

window.abrirChat = async function() {
  const user = auth.currentUser;
  if (!user) { $('modalLogin').classList.remove('hidden'); return; }
  if (!propData) return;
  try {
    const chatId = await iniciarOAbrirChat(propData.propietarioId, propData.id);
    window.location.href = `chat.html?chat=${chatId}`;
  } catch (err) {
    console.error(err);
  }
};

// ─── Compartir ───

$('btnShare')?.addEventListener('click', async () => {
  if (navigator.share) {
    await navigator.share({ title: document.title, url: window.location.href });
  } else {
    await navigator.clipboard.writeText(window.location.href);
    $('btnShare').textContent = '✓ Copiado';
    setTimeout(() => $('btnShare').textContent = '🔗 Compartir', 2000);
  }
});

// ─── Helpers ───

function tiempoRelativo(fecha) {
  if (!fecha) return '—';
  const dias = Math.floor((Date.now() - fecha.getTime()) / 86400000);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7)  return `hace ${dias} días`;
  if (dias < 30) return `hace ${Math.floor(dias/7)} sem.`;
  return `hace ${Math.floor(dias/30)} meses`;
}

window.abrirLightbox = abrirLightbox;
