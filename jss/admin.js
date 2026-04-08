/* ═══════════════════════════════════════════════════════════
   InmoLocal — admin.js
   Panel de administración
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

// PROTECCIÓN: solo el admin puede acceder
// CON FIREBASE:
// auth.onAuthStateChanged(async user => {
//   if (!user) { window.location.href = 'login.html'; return; }
//   const doc = await db.collection('users').doc(user.uid).get();
//   if (doc.data()?.rol !== 'admin') { window.location.href = 'index.html'; return; }
// });

document.addEventListener('DOMContentLoaded', () => {
  setupAnuncioForm();
  setupUploadZone();
});

// ─── Toggle formulario ───
function setupAnuncioForm() {
  $('btnNuevoAnuncio')?.addEventListener('click', () => {
    $('anuncioForm').classList.toggle('hidden');
    // Poner fecha de hoy como inicio
    const hoy = new Date().toISOString().split('T')[0];
    $('adInicio').value = hoy;
    // Fecha fin por defecto: 1 mes después
    const fin = new Date(); fin.setMonth(fin.getMonth() + 1);
    $('adFin').value = fin.toISOString().split('T')[0];
  });

  $('btnCancelarAnuncio')?.addEventListener('click', () => {
    $('anuncioForm').classList.add('hidden');
  });

  $('btnGuardarAnuncio')?.addEventListener('click', guardarAnuncio);
  $('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    // auth.signOut().then(() => window.location.href = 'login.html');
    window.location.href = 'index.html';
  });
}

// ─── Upload zona imagen ───
function setupUploadZone() {
  const zone  = $('adImageZone');
  const input = $('adImageInput');
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) previewAdImage(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) previewAdImage(input.files[0]);
  });
}

function previewAdImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const zone = $('adImageZone');
    zone.innerHTML = `<img src="${e.target.result}" style="max-height:100px;border-radius:6px;"> <p style="font-size:12px;color:var(--text-light);margin-top:8px">${file.name}</p>`;
  };
  reader.readAsDataURL(file);
}

// ─── Guardar anuncio ───
async function guardarAnuncio() {
  const nombre   = $('adNombre')?.value.trim()   || '';
  const posicion = $('adPosicion')?.value        || '';
  const link     = $('adLink')?.value.trim()     || '';
  const emoji    = $('adEmoji')?.value.trim()    || '📢';
  const texto    = $('adTexto')?.value.trim()    || '';
  const inicio   = $('adInicio')?.value          || '';
  const fin      = $('adFin')?.value             || '';
  const precio   = parseFloat($('adPrecio')?.value) || 0;

  if (!nombre || !posicion || !inicio || !fin) {
    showAlert('alertAnuncio', 'Completa los campos requeridos.', 'error');
    return;
  }

  // CON FIREBASE:
  // await db.collection('anuncios').add({
  //   nombre, posicion, linkDestino: link, emoji, texto,
  //   fechaInicio: new Date(inicio),
  //   fechaFin: new Date(fin),
  //   precio, activo: true, clicks: 0,
  //   creadoEn: firebase.firestore.FieldValue.serverTimestamp()
  // });

  showAlert('alertAnuncio', `✓ Anuncio "${nombre}" creado. (Demo — conecta Firebase para guardar)`, 'success');
  setTimeout(() => $('anuncioForm').classList.add('hidden'), 2000);
}

// ─── Acciones de propiedades ───
window.adminEliminarProp = function(id) {
  if (!confirm('¿Eliminar esta propiedad permanentemente?')) return;
  // CON FIREBASE: db.collection('propiedades').doc(id).delete();
  alert('Propiedad eliminada. (Demo)');
};

window.adminDestacar = function(id) {
  // CON FIREBASE: db.collection('propiedades').doc(id).update({ destacada: true });
  alert(`Propiedad ${id} marcada como destacada. (Demo)`);
};

// ─── Helper ───
function showAlert(id, msg, type) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}
