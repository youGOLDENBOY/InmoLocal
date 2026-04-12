/* ═══════════════════════════════════════════════════════════
   InmoLocal — admin.js  —  Firebase real
   Panel de administración completo
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

// ─── ADMIN UID — cámbialo por el tuyo ───
// Para obtenerlo: ve a Firebase Console → Authentication
// y copia el UID de tu usuario
const ADMIN_UID = 'REEMPLAZA_CON_TU_UID';

document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }

    // Verificar que es admin
    // Si no configuraste el UID, comentar estas líneas para pruebas
    // if (user.uid !== ADMIN_UID) { window.location.href = 'index.html'; return; }

    cargarStats();
    cargarAnuncios();
    cargarPropiedadesAdmin();
    setupAnuncioForm();
  });

  $('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await auth.signOut();
    window.location.href = 'index.html';
  });
});

// ════════════════════════════════════════
// STATS
// ════════════════════════════════════════

async function cargarStats() {
  try {
    const [propsSnap, usersSnap, adsSnap, chatsSnap] = await Promise.all([
      db.collection('propiedades').where('estado', '==', 'disponible').get(),
      db.collection('users').get(),
      db.collection('anuncios').where('activo', '==', true).get(),
      db.collection('chats').get(),
    ]);

    $('totalProps').textContent  = propsSnap.size;
    $('totalUsers').textContent  = usersSnap.size;
    $('totalAds').textContent    = adsSnap.size;
    $('totalChats').textContent  = chatsSnap.size;
  } catch (err) {
    console.error('Error cargando stats:', err);
  }
}

// ════════════════════════════════════════
// ANUNCIOS
// ════════════════════════════════════════

async function cargarAnuncios() {
  const list = $('anunciosAdminList');
  if (!list) return;
  list.innerHTML = '<p style="color:var(--text-light);padding:16px">Cargando anuncios...</p>';

  try {
    const snap = await db.collection('anuncios').orderBy('creadoEn', 'desc').get();

    if (snap.empty) {
      list.innerHTML = '<p style="color:var(--text-light);padding:16px">No hay anuncios aún. Crea el primero.</p>';
      return;
    }

    list.innerHTML = '';
    snap.docs.forEach(doc => {
      const a    = { id: doc.id, ...doc.data() };
      const hoy  = new Date();
      const fin  = a.fechaFin?.toDate?.() || new Date(a.fechaFin || 0);
      const expirado = fin < hoy;
      const statusClass = expirado ? 'status-pausada' : 'status-disponible';
      const statusLabel = expirado ? 'Expirado' : 'Activo';
      const finStr = fin.toLocaleDateString('es-DO');

      const div = document.createElement('div');
      div.className = 'ad-admin-card';
      div.innerHTML = `
        <div class="ad-admin-icon">${a.emoji || '📢'}</div>
        <div class="ad-admin-info">
          <p class="ad-admin-name">${a.nombre || '—'}</p>
          <p class="ad-admin-detail">${a.posicion} · Expira: ${finStr} · RD$${(a.precio||0).toLocaleString()}</p>
          <div class="ad-admin-badges">
            <span class="status-badge ${statusClass}">${statusLabel}</span>
            <span style="font-size:11px;color:var(--text-light)">👁 ${a.clicks || 0} clicks</span>
          </div>
        </div>
        <div class="ad-admin-actions">
          ${expirado
            ? `<button class="btn-primary btn-sm" onclick="renovarAnuncio('${doc.id}')">🔄 Renovar</button>`
            : `<button class="btn-danger btn-sm" onclick="pausarAnuncio('${doc.id}')">⏸ Pausar</button>`}
          <button class="btn-danger btn-sm" onclick="eliminarAnuncio('${doc.id}')">🗑</button>
        </div>`;
      list.appendChild(div);
    });
  } catch (err) {
    list.innerHTML = `<p style="color:var(--error);padding:16px">Error: ${err.message}</p>`;
  }
}

window.pausarAnuncio = async (id) => {
  if (!confirm('¿Pausar este anuncio?')) return;
  await db.collection('anuncios').doc(id).update({ activo: false });
  cargarAnuncios();
};
window.renovarAnuncio = async (id) => {
  const fin = new Date(); fin.setMonth(fin.getMonth() + 1);
  await db.collection('anuncios').doc(id).update({ activo: true, fechaFin: fin });
  cargarAnuncios();
};
window.eliminarAnuncio = async (id) => {
  if (!confirm('¿Eliminar permanentemente este anuncio?')) return;
  await db.collection('anuncios').doc(id).delete();
  cargarAnuncios();
};

// ─── Crear anuncio ───
function setupAnuncioForm() {
  $('btnNuevoAnuncio')?.addEventListener('click', () => {
    $('anuncioForm').classList.toggle('hidden');
    const hoy = new Date().toISOString().split('T')[0];
    $('adInicio').value = hoy;
    const fin = new Date(); fin.setMonth(fin.getMonth() + 1);
    $('adFin').value = fin.toISOString().split('T')[0];
  });

  $('btnCancelarAnuncio')?.addEventListener('click', () => {
    $('anuncioForm').classList.add('hidden');
  });

  // Upload zona imagen
  const zone  = $('adImageZone');
  const input = $('adImageInput');
  zone?.addEventListener('click', () => input?.click());
  input?.addEventListener('change', () => {
    if (input.files[0]) previewAdImage(input.files[0]);
  });

  $('btnGuardarAnuncio')?.addEventListener('click', guardarAnuncio);
}

function previewAdImage(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const zone = $('adImageZone');
    zone.innerHTML = `<img src="${e.target.result}" style="max-height:100px;border-radius:6px">
      <p style="font-size:12px;color:var(--text-light);margin-top:8px">${file.name}</p>`;
  };
  reader.readAsDataURL(file);
}

async function guardarAnuncio() {
  const nombre   = $('adNombre')?.value.trim()  || '';
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

  try {
    await db.collection('anuncios').add({
      nombre, posicion, linkDestino: link, emoji, texto,
      fechaInicio: new Date(inicio),
      fechaFin:    new Date(fin),
      precio, activo: true, clicks: 0,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });

    showAlert('alertAnuncio', `✓ Anuncio "${nombre}" creado exitosamente.`, 'success');
    $('anuncioForm').classList.add('hidden');
    cargarAnuncios();
    cargarStats();
  } catch (err) {
    showAlert('alertAnuncio', `Error: ${err.message}`, 'error');
  }
}

// ════════════════════════════════════════
// PROPIEDADES (admin)
// ════════════════════════════════════════

async function cargarPropiedadesAdmin() {
  const tbody = $('adminPropsBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-light);padding:16px">Cargando...</td></tr>';

  try {
    const snap = await db.collection('propiedades')
      .orderBy('creadaEn', 'desc')
      .limit(50)
      .get();

    tbody.innerHTML = '';

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-light);padding:16px">Sin propiedades aún.</td></tr>';
      return;
    }

    snap.docs.forEach(doc => {
      const p = { id: doc.id, ...doc.data() };
      const moneda = p.moneda === 'USD' ? 'USD$' : 'RD$';
      const precio = (p.precio || 0).toLocaleString('es-DO');
      const estadoClass = { disponible: 'status-disponible', pausada: 'status-pausada', vendida: 'status-vendida' }[p.estado] || 'status-disponible';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.titulo}</strong><br><small>${p.tipo} · ${p.modalidad} · ${p.direccion || ''}</small></td>
        <td>${p.propietarioNombre || '—'}</td>
        <td>${moneda} ${precio}</td>
        <td>${p.vistas || 0}</td>
        <td><span class="status-badge ${estadoClass}">${p.estado || 'disponible'}</span></td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <a href="propiedad.html?id=${p.id}" class="btn-outline btn-sm" target="_blank">Ver</a>
            <button class="btn-outline btn-sm" onclick="adminDestacar('${p.id}',${!p.destacada})">
              ${p.destacada ? '⭐ Quitar' : '⭐ Destacar'}
            </button>
            <button class="btn-danger btn-sm" onclick="adminEliminarProp('${p.id}')">🗑</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });

    // Ingresos estimados
    const adsSnap = await db.collection('anuncios').get();
    const total = adsSnap.docs.reduce((sum, d) => sum + (d.data().precio || 0), 0);
    $('ingresoTotal') && ($('ingresoTotal').textContent = `RD$ ${total.toLocaleString('es-DO')}`);

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--error)">Error: ${err.message}</td></tr>`;
  }
}

window.adminDestacar = async (id, destacar) => {
  await db.collection('propiedades').doc(id).update({ destacada: destacar });
  cargarPropiedadesAdmin();
};
window.adminEliminarProp = async (id) => {
  if (!confirm('¿Eliminar esta propiedad permanentemente?')) return;
  await db.collection('propiedades').doc(id).delete();
  cargarPropiedadesAdmin();
  cargarStats();
};

// ─── Filtro tabla ───
$('adminPropFilter')?.addEventListener('change', async (e) => {
  const val   = e.target.value;
  const tbody = $('adminPropsBody');
  tbody.innerHTML = '<tr><td colspan="6" style="padding:16px;color:var(--text-light)">Filtrando...</td></tr>';

  let query = db.collection('propiedades').orderBy('creadaEn', 'desc');
  if (val) query = query.where('estado', '==', val);

  const snap = await query.limit(50).get();
  tbody.innerHTML = '';
  snap.docs.forEach(doc => {
    const p = { id: doc.id, ...doc.data() };
    const estadoClass = { disponible: 'status-disponible', pausada: 'status-pausada' }[p.estado] || 'status-disponible';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.titulo}</strong><br><small>${p.tipo} · ${p.modalidad}</small></td>
      <td>${p.propietarioNombre || '—'}</td>
      <td>RD$ ${(p.precio||0).toLocaleString('es-DO')}</td>
      <td>${p.vistas || 0}</td>
      <td><span class="status-badge ${estadoClass}">${p.estado}</span></td>
      <td><a href="propiedad.html?id=${p.id}" class="btn-outline btn-sm" target="_blank">Ver</a></td>`;
    tbody.appendChild(tr);
  });
});

// ─── Helper ───
function showAlert(id, msg, type) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}
