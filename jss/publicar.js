/* ═══════════════════════════════════════════════════════════
   InmoLocal — publicar.js
   Lógica del formulario de publicación:
   - Navegación entre pasos
   - Subida y previsualización de fotos/videos
   - Validación por pasos
   - Vista previa en paso 3
   - Publicación en Firebase
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

let currentStep = 1;
const MAX_FOTOS  = 10;
const MAX_VIDEOS = 3;
const MAX_VIDEO_DURATION = 10; // segundos

let fotosSeleccionadas  = []; // Array de File
let videosSeleccionados = []; // Array de File

// ─── Inicializar ───
document.addEventListener('DOMContentLoaded', () => {

  // Toggle tipo
  setupToggleGroup('tipoGroup', 'tipo');
  setupToggleGroup('modalidadGroup', 'modalidad');

  // Contadores de texto
  setupCharCounter('titulo', 'tituloCount', 80);
  setupCharCounter('descripcion', 'descCount', 1000);

  // Zonas de upload
  setupFotoUpload();
  setupVideoUpload();

  // Navegación de pasos
  $('btnStep1Next')?.addEventListener('click', () => {
    if (validarPaso1()) irAPaso(2);
  });
  $('btnStep2Back')?.addEventListener('click', () => irAPaso(1));
  $('btnStep2Next')?.addEventListener('click', () => {
    actualizarPreview();
    irAPaso(3);
  });
  $('btnStep3Back')?.addEventListener('click', () => irAPaso(2));

  // Submit
  $('publicarForm')?.addEventListener('submit', handlePublicar);
});

// ─── Toggle group (tipo / modalidad) ───
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

// ─── Contador de caracteres ───
function setupCharCounter(inputId, countId, max) {
  const el    = $(inputId);
  const count = $(countId);
  if (!el || !count) return;

  el.addEventListener('input', () => {
    count.textContent = el.value.length;
    if (el.value.length >= max * 0.9) {
      count.style.color = 'var(--error)';
    } else {
      count.style.color = '';
    }
  });
}

// ─── FOTOS ───
function setupFotoUpload() {
  const zone  = $('fotoZone');
  const input = $('fotoInput');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    procesarFotos(Array.from(e.dataTransfer.files));
  });

  input.addEventListener('change', () => {
    procesarFotos(Array.from(input.files));
    input.value = ''; // reset para permitir re-subir mismos archivos
  });

  $('btnAddMoreFotos')?.addEventListener('click', () => input.click());
}

function procesarFotos(archivos) {
  const permitidos = MAX_FOTOS - fotosSeleccionadas.length;
  if (permitidos <= 0) return;

  const validos = archivos
    .filter(f => f.type.startsWith('image/'))
    .slice(0, permitidos);

  fotosSeleccionadas = [...fotosSeleccionadas, ...validos];
  renderFotoPreview();
}

function renderFotoPreview() {
  const preview = $('fotoPreview');
  const counter = $('fotoCountLabel');
  if (!preview || !counter) return;

  preview.innerHTML = '';
  counter.textContent = `${fotosSeleccionadas.length}/${MAX_FOTOS} fotos`;

  fotosSeleccionadas.forEach((file, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'upload-thumb';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = `Foto ${i + 1}`;

    const order = document.createElement('div');
    order.className = 'thumb-order';
    order.textContent = i === 0 ? '⭐ Principal' : `${i + 1}`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'thumb-remove';
    removeBtn.type = 'button';
    removeBtn.innerHTML = '✕';
    removeBtn.addEventListener('click', () => {
      fotosSeleccionadas.splice(i, 1);
      renderFotoPreview();
    });

    wrap.appendChild(img);
    wrap.appendChild(order);
    wrap.appendChild(removeBtn);
    preview.appendChild(wrap);
  });

  // Mostrar/ocultar zona según cantidad
  const zone = $('fotoZone');
  const addMore = $('btnAddMoreFotos');
  if (fotosSeleccionadas.length >= MAX_FOTOS) {
    zone.style.display = 'none';
    if (addMore) addMore.style.display = 'none';
  } else {
    zone.style.display = '';
    if (addMore) addMore.style.display = fotosSeleccionadas.length > 0 ? 'inline' : 'none';
  }
}

// ─── VIDEOS ───
function setupVideoUpload() {
  const zone  = $('videoZone');
  const input = $('videoInput');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    procesarVideos(Array.from(e.dataTransfer.files));
  });

  input.addEventListener('change', () => {
    procesarVideos(Array.from(input.files));
    input.value = '';
  });
}

async function procesarVideos(archivos) {
  const alertEl = $('alertVideo');
  const permitidos = MAX_VIDEOS - videosSeleccionados.length;
  if (permitidos <= 0) return;

  const validos = archivos
    .filter(f => f.type.startsWith('video/'))
    .slice(0, permitidos);

  const errores = [];
  const aprobados = [];

  for (const file of validos) {
    const duration = await getVideoDuration(file);
    if (duration > MAX_VIDEO_DURATION) {
      errores.push(`"${file.name}" dura ${Math.round(duration)}s (máx. ${MAX_VIDEO_DURATION}s)`);
    } else {
      aprobados.push(file);
    }
  }

  if (errores.length > 0 && alertEl) {
    alertEl.textContent = `⚠️ Videos rechazados: ${errores.join(', ')}`;
    alertEl.classList.remove('hidden');
    setTimeout(() => alertEl.classList.add('hidden'), 5000);
  }

  videosSeleccionados = [...videosSeleccionados, ...aprobados];
  renderVideoPreview();
}

function getVideoDuration(file) {
  return new Promise(resolve => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => resolve(0);
  });
}

function renderVideoPreview() {
  const preview = $('videoPreview');
  const counter = $('videoCountLabel');
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
    order.className = 'thumb-order';
    order.textContent = `🎬 ${i + 1}`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'thumb-remove';
    removeBtn.type = 'button';
    removeBtn.innerHTML = '✕';
    removeBtn.addEventListener('click', () => {
      videosSeleccionados.splice(i, 1);
      renderVideoPreview();
    });

    wrap.appendChild(vid);
    wrap.appendChild(order);
    wrap.appendChild(removeBtn);
    preview.appendChild(wrap);
  });

  const zone = $('videoZone');
  if (videosSeleccionados.length >= MAX_VIDEOS) {
    zone.style.display = 'none';
  } else {
    zone.style.display = '';
  }
}

// ─── NAVEGACIÓN DE PASOS ───
function irAPaso(num) {
  // Ocultar paso actual
  const pasoActual = document.querySelector('.form-step.active');
  if (pasoActual) pasoActual.classList.remove('active');

  // Mostrar nuevo paso
  $(`step${num}`)?.classList.add('active');
  currentStep = num;

  // Actualizar indicador
  document.querySelectorAll('.step').forEach((s, i) => {
    const n = i + 1; // i va de 0 a 2, que corresponde a step 1, 2, 3
    // Hay 2 .step-line entre los 3 .step, querySelectorAll('.step') selecciona solo los .step
    s.classList.remove('active', 'done');
    if (n < num)  s.classList.add('done');
    if (n === num) s.classList.add('active');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── VALIDACIÓN PASO 1 ───
function validarPaso1() {
  let ok = true;

  const titulo = $('titulo')?.value.trim() || '';
  if (titulo.length < 5) {
    setError('grpTitulo', true);
    ok = false;
  } else {
    setError('grpTitulo', false);
  }

  const desc = $('descripcion')?.value.trim() || '';
  if (desc.length < 20) {
    setError('grpDesc', true);
    ok = false;
  } else {
    setError('grpDesc', false);
  }

  const precio = parseFloat($('precio')?.value) || 0;
  if (precio <= 0) {
    setError('grpPrecio', true);
    ok = false;
  } else {
    setError('grpPrecio', false);
  }

  const hab = parseInt($('habitaciones')?.value) || -1;
  if (hab < 0) {
    setError('grpHab', true);
    ok = false;
  } else {
    setError('grpHab', false);
  }

  const banos = parseInt($('banos')?.value) || -1;
  if (banos < 0) {
    setError('grpBanos', true);
    ok = false;
  } else {
    setError('grpBanos', false);
  }

  const dir = $('direccion')?.value.trim() || '';
  if (dir.length < 3) {
    setError('grpDireccion', true);
    ok = false;
  } else {
    setError('grpDireccion', false);
  }

  return ok;
}

function setError(groupId, show) {
  $(groupId)?.classList.toggle('has-error', show);
}

// ─── ACTUALIZAR PREVIEW (paso 3) ───
function actualizarPreview() {
  const tipo     = $('tipo')?.value     || 'casa';
  const modalidad = $('modalidad')?.value || 'venta';
  const precio   = parseFloat($('precio')?.value) || 0;
  const moneda   = $('moneda')?.value   || 'DOP';
  const titulo   = $('titulo')?.value   || '';
  const desc     = $('descripcion')?.value || '';
  const dir      = $('direccion')?.value || '';
  const hab      = $('habitaciones')?.value || '—';
  const banos    = $('banos')?.value    || '—';
  const metros   = $('metros')?.value   || '';

  // Precio
  const precioFormateado = precio.toLocaleString('es-DO');
  const sufijo = modalidad === 'alquiler' ? '/mes' : '';
  $('previewPrecio').innerHTML = `${moneda === 'DOP' ? 'RD$' : 'USD$'} ${precioFormateado} <small>${sufijo}</small>`;

  $('previewTitulo').textContent  = titulo || 'Tu título aquí';
  $('previewDireccion').textContent = dir || '—';
  $('previewDesc').textContent    = desc;

  // Features
  const features = $('previewFeatures');
  features.innerHTML = '';
  if (hab) features.innerHTML += `<span>🛏 ${hab} hab.</span>`;
  if (banos) features.innerHTML += `<span>🚿 ${banos} baños</span>`;
  if (metros) features.innerHTML += `<span>📐 ${metros} m²</span>`;

  // Badges
  const badges = $('previewBadges');
  badges.innerHTML = `
    <span class="badge badge-${modalidad}">${modalidad === 'venta' ? 'Venta' : 'Alquiler'}</span>
    <span class="badge badge-tipo">${tipo === 'casa' ? 'Casa' : 'Apartamento'}</span>
  `;

  // Foto principal
  if (fotosSeleccionadas.length > 0) {
    const img = $('previewImg');
    const placeholder = $('previewImgPlaceholder');
    img.src = URL.createObjectURL(fotosSeleccionadas[0]);
    img.style.display = 'block';
    placeholder.style.display = 'none';
  }

  // Info de contacto (demo — viene de Firebase Auth)
  $('previewNombre').textContent  = 'Tu nombre (de tu cuenta)';
  $('previewTelefono').textContent = 'Tu WhatsApp';
  $('previewAvatar').textContent  = '?';
}

// ─── PUBLICAR ───
async function handlePublicar(e) {
  e.preventDefault();

  const alertEl = $('alertPublicar');
  const alertOk = $('alertPublicarOk');
  if (alertEl) alertEl.classList.add('hidden');
  if (alertOk) alertOk.classList.add('hidden');

  // Verificar login
  // const user = auth?.currentUser;
  // if (!user) {
  //   alertEl.textContent = 'Debes iniciar sesión para publicar.';
  //   alertEl.classList.remove('hidden');
  //   return;
  // }

  setLoading('btnPublicarText', 'btnPublicarSpinner', true);

  try {
    const datos = {
      tipo:        $('tipo')?.value        || 'casa',
      modalidad:   $('modalidad')?.value   || 'venta',
      titulo:      $('titulo')?.value.trim(),
      descripcion: $('descripcion')?.value.trim(),
      precio:      parseFloat($('precio')?.value) || 0,
      moneda:      $('moneda')?.value      || 'DOP',
      habitaciones: parseInt($('habitaciones')?.value) || 0,
      banos:       parseInt($('banos')?.value)         || 0,
      metros:      parseFloat($('metros')?.value)      || 0,
      direccion:   $('direccion')?.value.trim(),
      referencia:  $('referencia')?.value.trim(),
      amenidades:  Array.from(document.querySelectorAll('.amenidad-check input:checked')).map(i => i.value),
      mostrarTelefono: $('mostrarTelefono')?.checked ?? true,
    };

    // ─── CON FIREBASE (descomenta cuando conectes): ───
    /*
    const user = auth.currentUser;
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();

    // Subir fotos
    const fotosUrls = [];
    for (let i = 0; i < fotosSeleccionadas.length; i++) {
      actualizarProgreso(`Subiendo foto ${i+1}/${fotosSeleccionadas.length}...`, ((i+1)/fotosSeleccionadas.length) * 60);
      const ref = storage.ref(`propiedades/${user.uid}_${Date.now()}_foto${i}`);
      const snap = await ref.put(fotosSeleccionadas[i]);
      fotosUrls.push(await snap.ref.getDownloadURL());
    }

    // Subir videos
    const videosUrls = [];
    for (let i = 0; i < videosSeleccionados.length; i++) {
      actualizarProgreso(`Subiendo video ${i+1}/${videosSeleccionados.length}...`, 60 + ((i+1)/videosSeleccionados.length) * 35);
      const ref = storage.ref(`propiedades/${user.uid}_${Date.now()}_video${i}`);
      const snap = await ref.put(videosSeleccionados[i]);
      videosUrls.push(await snap.ref.getDownloadURL());
    }

    actualizarProgreso('Guardando publicación...', 98);

    const ref = await db.collection('propiedades').add({
      ...datos,
      fotos: fotosUrls,
      videos: videosUrls,
      propietarioId: user.uid,
      propietarioNombre: userData.nombre,
      propietarioTelefono: datos.mostrarTelefono ? userData.telefono : '',
      estado: 'disponible',
      destacada: false,
      vistas: 0,
      creadaEn: firebase.firestore.FieldValue.serverTimestamp(),
      actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
    });

    actualizarProgreso('¡Publicado!', 100);
    setTimeout(() => {
      window.location.href = `propiedad.html?id=${ref.id}`;
    }, 800);
    */

    // ─── DEMO (sin Firebase): ───
    $('uploadProgress')?.classList.remove('hidden');
    for (let i = 1; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 40));
      actualizarProgreso(`Procesando... ${i}%`, i);
    }

    if (alertOk) {
      alertOk.textContent = '✓ ¡Propiedad publicada con éxito! (Demo — conecta Firebase para guardar en la nube)';
      alertOk.classList.remove('hidden');
    }

  } catch (err) {
    console.error(err);
    if (alertEl) {
      alertEl.textContent = `Error: ${err.message}`;
      alertEl.classList.remove('hidden');
    }
  } finally {
    setLoading('btnPublicarText', 'btnPublicarSpinner', false);
  }
}

function actualizarProgreso(label, pct) {
  const fill  = $('progressFill');
  const lbl   = $('progressLabel');
  if (fill) fill.style.width = pct + '%';
  if (lbl)  lbl.textContent  = label;
}

function setLoading(textId, spinnerId, isLoading) {
  $(textId)?.classList.toggle('hidden', isLoading);
  $(spinnerId)?.classList.toggle('hidden', !isLoading);
}
