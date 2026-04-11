/* ═══════════════════════════════════════════════════════════
   InmoLocal — publicar.js
   Subida de fotos/videos: Cloudinary
   Datos de la propiedad: Firebase Firestore
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

// ─── Cloudinary config ───
const CLOUDINARY_CLOUD  = 'dadg7wjzk';
const CLOUDINARY_PRESET = 'inmolocal_upload';
const CLOUDINARY_URL    = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/upload`;

const MAX_FOTOS  = 10;
const MAX_VIDEOS = 3;
const MAX_VIDEO_DURATION = 10; // segundos

let fotosSeleccionadas  = [];
let videosSeleccionados = [];

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  setupToggleGroup('tipoGroup',      'tipo');
  setupToggleGroup('modalidadGroup', 'modalidad');
  setupCharCounter('titulo',      'tituloCount', 80);
  setupCharCounter('descripcion', 'descCount',   1000);
  setupFotoUpload();
  setupVideoUpload();

  $('btnStep1Next')?.addEventListener('click', () => { if (validarPaso1()) irAPaso(2); });
  $('btnStep2Back')?.addEventListener('click', () => irAPaso(1));
  $('btnStep2Next')?.addEventListener('click', () => { actualizarPreview(); irAPaso(3); });
  $('btnStep3Back')?.addEventListener('click', () => irAPaso(2));
  $('publicarForm')?.addEventListener('submit', handlePublicar);

  // Nombre del usuario en preview
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try {
      const perfil = await obtenerPerfil(user.uid);
      if ($('previewNombre'))   $('previewNombre').textContent   = perfil?.nombre   || user.displayName || '—';
      if ($('previewTelefono')) $('previewTelefono').textContent = perfil?.telefono  || '—';
      if ($('previewAvatar'))   $('previewAvatar').textContent   = (perfil?.nombre || user.displayName || 'U')[0].toUpperCase();
    } catch (_) {}
  });
});

// ════════════════════════════════════════
// SUBIDA A CLOUDINARY
// ════════════════════════════════════════

async function subirArchivoCloudinary(file, tipo, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file',         file);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    formData.append('resource_type', tipo === 'video' ? 'video' : 'image');

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        reject(new Error(`Cloudinary error ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Error de red al subir a Cloudinary')));

    // Endpoint según tipo
    const endpoint = tipo === 'video'
      ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`
      : `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;

    xhr.open('POST', endpoint);
    xhr.send(formData);
  });
}

// ════════════════════════════════════════
// PUBLICAR (Cloudinary + Firestore)
// ════════════════════════════════════════

async function handlePublicar(e) {
  e.preventDefault();

  const alertEl = $('alertPublicar');
  const alertOk = $('alertPublicarOk');
  alertEl?.classList.add('hidden');
  alertOk?.classList.add('hidden');

  const user = auth.currentUser;
  if (!user) {
    mostrarAlerta('alertPublicar', 'Debes iniciar sesión para publicar.', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return;
  }

  setLoading('btnPublicarText', 'btnPublicarSpinner', true);
  $('uploadProgress')?.classList.remove('hidden');

  try {
    const totalArchivos = fotosSeleccionadas.length + videosSeleccionados.length;
    let archivosSubidos = 0;

    // ─── Subir fotos a Cloudinary ───
    const fotosUrls = [];
    for (let i = 0; i < fotosSeleccionadas.length; i++) {
      actualizarProgreso(`Subiendo foto ${i + 1} de ${fotosSeleccionadas.length}...`,
        Math.round((archivosSubidos / Math.max(totalArchivos, 1)) * 90));

      const url = await subirArchivoCloudinary(fotosSeleccionadas[i], 'image', (pct) => {
        const global = Math.round(((archivosSubidos + pct / 100) / Math.max(totalArchivos, 1)) * 90);
        actualizarProgreso(`Subiendo foto ${i + 1} de ${fotosSeleccionadas.length}... ${pct}%`, global);
      });

      fotosUrls.push(url);
      archivosSubidos++;
    }

    // ─── Subir videos a Cloudinary ───
    const videosUrls = [];
    for (let i = 0; i < videosSeleccionados.length; i++) {
      actualizarProgreso(`Subiendo video ${i + 1} de ${videosSeleccionados.length}...`,
        Math.round((archivosSubidos / Math.max(totalArchivos, 1)) * 90));

      const url = await subirArchivoCloudinary(videosSeleccionados[i], 'video', (pct) => {
        const global = Math.round(((archivosSubidos + pct / 100) / Math.max(totalArchivos, 1)) * 90);
        actualizarProgreso(`Subiendo video ${i + 1} de ${videosSeleccionados.length}... ${pct}%`, global);
      });

      videosUrls.push(url);
      archivosSubidos++;
    }

    // ─── Guardar en Firestore ───
    actualizarProgreso('Guardando en la base de datos...', 95);

    const userDoc  = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data() || {};

    const datos = {
      tipo:         $('tipo')?.value        || 'casa',
      modalidad:    $('modalidad')?.value   || 'venta',
      titulo:       $('titulo')?.value.trim(),
      descripcion:  $('descripcion')?.value.trim(),
      precio:       parseFloat($('precio')?.value)       || 0,
      moneda:       $('moneda')?.value      || 'DOP',
      habitaciones: parseInt($('habitaciones')?.value)   || 0,
      banos:        parseInt($('banos')?.value)          || 0,
      metros:       parseFloat($('metros')?.value)       || 0,
      direccion:    $('direccion')?.value.trim(),
      referencia:   $('referencia')?.value.trim(),
      amenidades:   Array.from(document.querySelectorAll('.amenidad-check input:checked')).map(i => i.value),
      mostrarTelefono: $('mostrarTelefono')?.checked ?? true,
      fotos:               fotosUrls,
      videos:              videosUrls,
      propietarioId:       user.uid,
      propietarioNombre:   userData.nombre   || user.displayName || '',
      propietarioTelefono: ($('mostrarTelefono')?.checked) ? (userData.telefono || '') : '',
      estado:        'disponible',
      destacada:     false,
      vistas:        0,
      creadaEn:      firebase.firestore.FieldValue.serverTimestamp(),
      actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
    };

    const ref = await db.collection('propiedades').add(datos);

    actualizarProgreso('¡Publicado con éxito!', 100);

    setTimeout(() => {
      window.location.href = `propiedad.html?id=${ref.id}`;
    }, 800);

  } catch (err) {
    console.error('Error publicando:', err);
    mostrarAlerta('alertPublicar', `Error: ${err.message}`, 'error');
    $('uploadProgress')?.classList.add('hidden');
  } finally {
    setLoading('btnPublicarText', 'btnPublicarSpinner', false);
  }
}

function actualizarProgreso(label, pct) {
  const fill = $('progressFill');
  const lbl  = $('progressLabel');
  if (fill) fill.style.width    = Math.min(pct, 100) + '%';
  if (lbl)  lbl.textContent     = label;
}

function mostrarAlerta(id, msg, type) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className   = `alert alert-${type}`;
  el.classList.remove('hidden');
}

function setLoading(textId, spinnerId, isLoading) {
  $(textId)?.classList.toggle('hidden',  isLoading);
  $(spinnerId)?.classList.toggle('hidden', !isLoading);
}

// ════════════════════════════════════════
// TOGGLE GROUPS
// ════════════════════════════════════════

function setupToggleGroup(groupId, inputId) {
  const group = $(groupId), input = $(inputId);
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
    count.textContent  = el.value.length;
    count.style.color  = el.value.length >= max * 0.9 ? 'var(--error)' : '';
  });
}

// ════════════════════════════════════════
// UPLOAD FOTOS
// ════════════════════════════════════════

function setupFotoUpload() {
  const zone = $('fotoZone'), input = $('fotoInput');
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    procesarFotos(Array.from(e.dataTransfer.files));
  });
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
  preview.innerHTML   = '';
  counter.textContent = `${fotosSeleccionadas.length}/${MAX_FOTOS} fotos`;

  fotosSeleccionadas.forEach((file, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'upload-thumb';
    const img   = document.createElement('img');
    img.src     = URL.createObjectURL(file);
    const order = document.createElement('div');
    order.className   = 'thumb-order';
    order.textContent = i === 0 ? '⭐ Principal' : `${i + 1}`;
    const rm  = document.createElement('button');
    rm.className  = 'thumb-remove';
    rm.type       = 'button';
    rm.innerHTML  = '✕';
    rm.addEventListener('click', () => { fotosSeleccionadas.splice(i, 1); renderFotoPreview(); });
    wrap.appendChild(img); wrap.appendChild(order); wrap.appendChild(rm);
    preview.appendChild(wrap);
  });

  const zone   = $('fotoZone');
  const addMore = $('btnAddMoreFotos');
  zone.style.display = fotosSeleccionadas.length >= MAX_FOTOS ? 'none' : '';
  if (addMore) addMore.style.display = fotosSeleccionadas.length > 0 && fotosSeleccionadas.length < MAX_FOTOS ? 'inline' : 'none';
}

// ════════════════════════════════════════
// UPLOAD VIDEOS
// ════════════════════════════════════════

function setupVideoUpload() {
  const zone = $('videoZone'), input = $('videoInput');
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    procesarVideos(Array.from(e.dataTransfer.files));
  });
  input.addEventListener('change', () => { procesarVideos(Array.from(input.files)); input.value = ''; });
}

async function procesarVideos(archivos) {
  const alertEl   = $('alertVideo');
  const permitidos = MAX_VIDEOS - videosSeleccionados.length;
  if (permitidos <= 0) return;

  const validos   = archivos.filter(f => f.type.startsWith('video/')).slice(0, permitidos);
  const errores   = [], aprobados = [];

  for (const file of validos) {
    const dur = await getVideoDuration(file);
    if (dur > MAX_VIDEO_DURATION) {
      errores.push(`"${file.name}" (${Math.round(dur)}s — máx ${MAX_VIDEO_DURATION}s)`);
    } else {
      aprobados.push(file);
    }
  }

  if (errores.length && alertEl) {
    alertEl.textContent = `⚠️ Videos rechazados: ${errores.join(', ')}`;
    alertEl.classList.remove('hidden');
    setTimeout(() => alertEl.classList.add('hidden'), 6000);
  }

  videosSeleccionados = [...videosSeleccionados, ...aprobados];
  renderVideoPreview();
}

function getVideoDuration(file) {
  return new Promise(resolve => {
    const v     = document.createElement('video');
    v.preload   = 'metadata';
    v.src       = URL.createObjectURL(file);
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror          = () => resolve(0);
  });
}

function renderVideoPreview() {
  const preview = $('videoPreview'), counter = $('videoCountLabel');
  if (!preview || !counter) return;
  preview.innerHTML   = '';
  counter.textContent = `${videosSeleccionados.length}/${MAX_VIDEOS} videos`;

  videosSeleccionados.forEach((file, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'upload-thumb';
    const vid = document.createElement('video');
    vid.src   = URL.createObjectURL(file);
    vid.muted = true;
    vid.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    const order = document.createElement('div');
    order.className   = 'thumb-order';
    order.textContent = `🎬 ${i + 1}`;
    const rm  = document.createElement('button');
    rm.className  = 'thumb-remove';
    rm.type       = 'button';
    rm.innerHTML  = '✕';
    rm.addEventListener('click', () => { videosSeleccionados.splice(i, 1); renderVideoPreview(); });
    wrap.appendChild(vid); wrap.appendChild(order); wrap.appendChild(rm);
    preview.appendChild(wrap);
  });

  $('videoZone').style.display = videosSeleccionados.length >= MAX_VIDEOS ? 'none' : '';
}

// ════════════════════════════════════════
// NAVEGACIÓN PASOS
// ════════════════════════════════════════

function irAPaso(num) {
  document.querySelector('.form-step.active')?.classList.remove('active');
  $(`step${num}`)?.classList.add('active');
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 < num)   s.classList.add('done');
    if (i + 1 === num) s.classList.add('active');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validarPaso1() {
  let ok = true;
  const checks = [
    [$('titulo')?.value.trim().length >= 5,    'grpTitulo'],
    [$('descripcion')?.value.trim().length >= 20, 'grpDesc'],
    [parseFloat($('precio')?.value) > 0,        'grpPrecio'],
    [parseInt($('habitaciones')?.value) >= 0,   'grpHab'],
    [parseInt($('banos')?.value) >= 0,          'grpBanos'],
    [$('direccion')?.value.trim().length >= 3,  'grpDireccion'],
  ];
  checks.forEach(([valid, groupId]) => {
    $(groupId)?.classList.toggle('has-error', !valid);
    if (!valid) ok = false;
  });
  return ok;
}

function actualizarPreview() {
  const tipo      = $('tipo')?.value      || 'casa';
  const modalidad = $('modalidad')?.value || 'venta';
  const precio    = parseFloat($('precio')?.value) || 0;
  const moneda    = $('moneda')?.value    || 'DOP';
  const sym       = moneda === 'DOP' ? 'RD$' : 'USD$';
  const sufijo    = modalidad === 'alquiler' ? '<small>/mes</small>' : '';

  $('previewPrecio').innerHTML      = `${sym} ${precio.toLocaleString('es-DO')} ${sufijo}`;
  $('previewTitulo').textContent    = $('titulo')?.value    || 'Tu título aquí';
  $('previewDireccion').textContent = $('direccion')?.value || '—';
  $('previewDesc').textContent      = $('descripcion')?.value || '';

  const feat = $('previewFeatures');
  feat.innerHTML = '';
  const hab    = $('habitaciones')?.value;
  const banos  = $('banos')?.value;
  const metros = $('metros')?.value;
  if (hab)    feat.innerHTML += `<span>🛏 ${hab} hab.</span>`;
  if (banos)  feat.innerHTML += `<span>🚿 ${banos} baños</span>`;
  if (metros) feat.innerHTML += `<span>📐 ${metros} m²</span>`;

  $('previewBadges').innerHTML = `
    <span class="badge badge-${modalidad}">${modalidad === 'venta' ? 'Venta' : 'Alquiler'}</span>
    <span class="badge badge-tipo">${tipo === 'casa' ? 'Casa' : 'Apartamento'}</span>`;

  if (fotosSeleccionadas.length > 0) {
    const img = $('previewImg');
    img.src = URL.createObjectURL(fotosSeleccionadas[0]);
    img.style.display = 'block';
    $('previewImgPlaceholder').style.display = 'none';
  }
}
