/* ═══════════════════════════════════════════════════════════
   InmoLocal — publicar.js
   Formulario de publicación conectado a Firebase real
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

let currentStep = 1;
const MAX_FOTOS  = 10;
const MAX_VIDEOS = 3;
const MAX_VIDEO_DURATION = 10; // segundos

let fotosSeleccionadas  = [];
let videosSeleccionados = [];

document.addEventListener('DOMContentLoaded', () => {
  setupToggleGroup('tipoGroup', 'tipo');
  setupToggleGroup('modalidadGroup', 'modalidad');
  setupCharCounter('titulo', 'tituloCount', 80);
  setupCharCounter('descripcion', 'descCount', 1000);
  setupFotoUpload();
  setupVideoUpload();

  $('btnStep1Next')?.addEventListener('click', () => { if (validarPaso1()) irAPaso(2); });
  $('btnStep2Back')?.addEventListener('click', () => irAPaso(1));
  $('btnStep2Next')?.addEventListener('click', () => { actualizarPreview(); irAPaso(3); });
  $('btnStep3Back')?.addEventListener('click', () => irAPaso(2));
  $('publicarForm')?.addEventListener('submit', handlePublicar);

  // Cargar nombre del usuario en preview
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    const perfil = await obtenerPerfil(user.uid);
    if ($('previewNombre'))   $('previewNombre').textContent   = perfil?.nombre   || user.displayName || '—';
    if ($('previewTelefono')) $('previewTelefono').textContent = perfil?.telefono  || '—';
    if ($('previewAvatar'))   $('previewAvatar').textContent   = (perfil?.nombre || user.displayName || 'U')[0].toUpperCase();
  });
});

function setupToggleGroup(groupId, inputId) {
  const group = $(groupId);
  const input = $(inputId);
  if (!group || !input) return;
  group.querySelectorAll('.toggle-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.toggle-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      input.value = btn.dataset.val;
    });
  });
}

function setupCharCounter(inputId, countId, max) {
  const el = $(inputId), count = $(countId);
  if (!el || !count) return;
  el.addEventListener('input', () => {
    count.textContent = el.value.length;
    count.style.color = el.value.length >= max * 0.9 ? 'var(--error)' : '';
  });
}

// ─── FOTOS ───
function setupFotoUpload() {
  const zone = $('fotoZone'), input = $('fotoInput');
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); procesarFotos(Array.from(e.dataTransfer.files)); });
  input.addEventListener('change', () => { procesarFotos(Array.from(input.files)); input.value = ''; });
  $('btnAddMoreFotos')?.addEventListener('click', () => input.click());
}

function procesarFotos(archivos) {
  const permitidos = MAX_FOTOS - fotosSeleccionadas.length;
  if (permitidos <= 0) return;
  const validos = archivos.filter(f => f.type.startsWith('image/')).slice(0, permitidos);
  fotosSeleccionadas = [...fotosSeleccionadas, ...validos];
  renderFotoPreview();
}

function renderFotoPreview() {
  const preview = $('fotoPreview'), counter = $('fotoCountLabel');
  if (!preview || !counter) return;
  preview.innerHTML = '';
  counter.textContent = `${fotosSeleccionadas.length}/${MAX_FOTOS} fotos`;
  fotosSeleccionadas.forEach((file, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'upload-thumb';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    const order = document.createElement('div');
    order.className = 'thumb-order';
    order.textContent = i === 0 ? '⭐ Principal' : `${i + 1}`;
    const rm = document.createElement('button');
    rm.className = 'thumb-remove'; rm.type = 'button'; rm.innerHTML = '✕';
    rm.addEventListener('click', () => { fotosSeleccionadas.splice(i, 1); renderFotoPreview(); });
    wrap.appendChild(img); wrap.appendChild(order); wrap.appendChild(rm);
    preview.appendChild(wrap);
  });
  const zone = $('fotoZone'), addMore = $('btnAddMoreFotos');
  zone.style.display = fotosSeleccionadas.length >= MAX_FOTOS ? 'none' : '';
  if (addMore) addMore.style.display = fotosSeleccionadas.length > 0 && fotosSeleccionadas.length < MAX_FOTOS ? 'inline' : 'none';
}

// ─── VIDEOS ───
function setupVideoUpload() {
  const zone = $('videoZone'), input = $('videoInput');
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); procesarVideos(Array.from(e.dataTransfer.files)); });
  input.addEventListener('change', () => { procesarVideos(Array.from(input.files)); input.value = ''; });
}

async function procesarVideos(archivos) {
  const alertEl = $('alertVideo');
  const permitidos = MAX_VIDEOS - videosSeleccionados.length;
  if (permitidos <= 0) return;
  const validos = archivos.filter(f => f.type.startsWith('video/')).slice(0, permitidos);
  const errores = [], aprobados = [];
  for (const file of validos) {
    const dur = await getVideoDuration(file);
    if (dur > MAX_VIDEO_DURATION) errores.push(`"${file.name}" (${Math.round(dur)}s)`);
    else aprobados.push(file);
  }
  if (errores.length && alertEl) {
    alertEl.textContent = `⚠️ Videos rechazados por duración: ${errores.join(', ')}`;
    alertEl.classList.remove('hidden');
    setTimeout(() => alertEl.classList.add('hidden'), 5000);
  }
  videosSeleccionados = [...videosSeleccionados, ...aprobados];
  renderVideoPreview();
}

function getVideoDuration(file) {
  return new Promise(resolve => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = URL.createObjectURL(file);
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror = () => resolve(0);
  });
}

function renderVideoPreview() {
  const preview = $('videoPreview'), counter = $('videoCountLabel');
  if (!preview || !counter) return;
  preview.innerHTML = '';
  counter.textContent = `${videosSeleccionados.length}/${MAX_VIDEOS} videos`;
  videosSeleccionados.forEach((file, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'upload-thumb';
    const vid = document.createElement('video');
    vid.src = URL.createObjectURL(file);
    vid.muted = true;
    vid.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    const order = document.createElement('div');
    order.className = 'thumb-order'; order.textContent = `🎬 ${i + 1}`;
    const rm = document.createElement('button');
    rm.className = 'thumb-remove'; rm.type = 'button'; rm.innerHTML = '✕';
    rm.addEventListener('click', () => { videosSeleccionados.splice(i, 1); renderVideoPreview(); });
    wrap.appendChild(vid); wrap.appendChild(order); wrap.appendChild(rm);
    preview.appendChild(wrap);
  });
  $('videoZone').style.display = videosSeleccionados.length >= MAX_VIDEOS ? 'none' : '';
}

// ─── NAVEGACIÓN PASOS ───
function irAPaso(num) {
  document.querySelector('.form-step.active')?.classList.remove('active');
  $(`step${num}`)?.classList.add('active');
  currentStep = num;
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 < num)  s.classList.add('done');
    if (i + 1 === num) s.classList.add('active');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validarPaso1() {
  let ok = true;
  const checks = [
    ['titulo',      $('titulo')?.value.trim().length >= 5,   'grpTitulo'],
    ['descripcion', $('descripcion')?.value.trim().length >= 20, 'grpDesc'],
    ['precio',      parseFloat($('precio')?.value) > 0,      'grpPrecio'],
    ['habitaciones',parseInt($('habitaciones')?.value) >= 0,  'grpHab'],
    ['banos',       parseInt($('banos')?.value) >= 0,         'grpBanos'],
    ['direccion',   $('direccion')?.value.trim().length >= 3, 'grpDireccion'],
  ];
  checks.forEach(([, valid, groupId]) => {
    setError(groupId, !valid);
    if (!valid) ok = false;
  });
  return ok;
}

function setError(groupId, show) { $(groupId)?.classList.toggle('has-error', show); }

function actualizarPreview() {
  const tipo      = $('tipo')?.value      || 'casa';
  const modalidad = $('modalidad')?.value || 'venta';
  const precio    = parseFloat($('precio')?.value) || 0;
  const moneda    = $('moneda')?.value    || 'DOP';
  const titulo    = $('titulo')?.value    || '';
  const desc      = $('descripcion')?.value || '';
  const dir       = $('direccion')?.value || '';
  const hab       = $('habitaciones')?.value || '—';
  const banos     = $('banos')?.value     || '—';
  const metros    = $('metros')?.value    || '';

  const sym    = moneda === 'DOP' ? 'RD$' : 'USD$';
  const sufijo = modalidad === 'alquiler' ? '<small>/mes</small>' : '';
  $('previewPrecio').innerHTML = `${sym} ${precio.toLocaleString('es-DO')} ${sufijo}`;
  $('previewTitulo').textContent    = titulo || 'Tu título aquí';
  $('previewDireccion').textContent = dir    || '—';
  $('previewDesc').textContent      = desc;

  const feat = $('previewFeatures');
  feat.innerHTML = '';
  if (hab)    feat.innerHTML += `<span>🛏 ${hab} hab.</span>`;
  if (banos)  feat.innerHTML += `<span>🚿 ${banos} baños</span>`;
  if (metros) feat.innerHTML += `<span>📐 ${metros} m²</span>`;

  $('previewBadges').innerHTML = `
    <span class="badge badge-${modalidad}">${modalidad === 'venta' ? 'Venta' : 'Alquiler'}</span>
    <span class="badge badge-tipo">${tipo === 'casa' ? 'Casa' : 'Apartamento'}</span>
  `;

  if (fotosSeleccionadas.length > 0) {
    const img = $('previewImg');
    img.src = URL.createObjectURL(fotosSeleccionadas[0]);
    img.style.display = 'block';
    $('previewImgPlaceholder').style.display = 'none';
  }
}

// ─── PUBLICAR (Firebase real) ───
async function handlePublicar(e) {
  e.preventDefault();
  const alertEl = $('alertPublicar');
  const alertOk = $('alertPublicarOk');
  alertEl?.classList.add('hidden');
  alertOk?.classList.add('hidden');

  // Verificar login
  const user = auth.currentUser;
  if (!user) {
    alertEl.textContent = 'Debes iniciar sesión para publicar.';
    alertEl?.classList.remove('hidden');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return;
  }

  setLoading('btnPublicarText', 'btnPublicarSpinner', true);
  $('uploadProgress')?.classList.remove('hidden');

  try {
    const datos = {
      tipo:         $('tipo')?.value        || 'casa',
      modalidad:    $('modalidad')?.value   || 'venta',
      titulo:       $('titulo')?.value.trim(),
      descripcion:  $('descripcion')?.value.trim(),
      precio:       parseFloat($('precio')?.value) || 0,
      moneda:       $('moneda')?.value      || 'DOP',
      habitaciones: parseInt($('habitaciones')?.value) || 0,
      banos:        parseInt($('banos')?.value)        || 0,
      metros:       parseFloat($('metros')?.value)     || 0,
      direccion:    $('direccion')?.value.trim(),
      referencia:   $('referencia')?.value.trim(),
      amenidades:   Array.from(document.querySelectorAll('.amenidad-check input:checked')).map(i => i.value),
      mostrarTelefono: $('mostrarTelefono')?.checked ?? true,
    };

    const propId = await publicarPropiedad(
      datos,
      fotosSeleccionadas,
      videosSeleccionados,
      (label, pct) => {
        $('progressFill').style.width = pct + '%';
        $('progressLabel').textContent = label;
      }
    );

    // Redirigir a la propiedad recién publicada
    setTimeout(() => {
      window.location.href = `propiedad.html?id=${propId}`;
    }, 600);

  } catch (err) {
    console.error(err);
    alertEl.textContent = `Error: ${err.message}`;
    alertEl?.classList.remove('hidden');
  } finally {
    setLoading('btnPublicarText', 'btnPublicarSpinner', false);
  }
}

function setLoading(textId, spinnerId, isLoading) {
  $(textId)?.classList.toggle('hidden', isLoading);
  $(spinnerId)?.classList.toggle('hidden', !isLoading);
}
