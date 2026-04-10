/* ═══════════════════════════════════════════════════════════
   InmoLocal — perfil.js  —  Firebase real
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    currentUser = user;

    const perfil = await obtenerPerfil(user.uid);
    cargarPerfil(user, perfil);
    await cargarMisPropiedades();
    await cargarFavoritos();
  });

  setupTabs();
  setupPasswordToggles();
  setupAcciones();
});

// ─── Cargar datos ───
function cargarPerfil(user, perfil) {
  const nombre = perfil?.nombre || user.displayName || 'Usuario';
  const ini    = nombre[0].toUpperCase();

  if ($('perfilAvatar')) $('perfilAvatar').textContent = ini;
  if ($('navAvatar'))    $('navAvatar').textContent    = ini;
  if ($('perfilNombre')) $('perfilNombre').textContent = nombre;
  if ($('perfilEmail'))  $('perfilEmail').textContent  = user.email;
  if ($('avatarPreview')) $('avatarPreview').textContent = ini;

  if ($('editNombre'))   $('editNombre').value   = nombre;
  if ($('editEmail'))    $('editEmail').value     = user.email;
  if ($('editTelefono')) $('editTelefono').value  = (perfil?.telefono || '').replace('+1', '');
  if ($('editBio'))      $('editBio').value       = perfil?.bio || '';

  // Avatar foto real
  const foto = perfil?.avatarUrl || user.photoURL;
  if (foto && $('perfilAvatar')) {
    $('perfilAvatar').innerHTML = `<img src="${foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  }
}

async function cargarMisPropiedades() {
  const props = await obtenerMisPropiedades();
  $('statProps').textContent  = props.length;

  let totalVistas = 0;
  props.forEach(p => { totalVistas += p.vistas || 0; });
  $('statVistas').textContent = totalVistas;

  const grid = $('myPropsGrid');
  if (!grid) return;

  if (!props.length) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-light)">
      <p style="font-size:32px">🏠</p>
      <p>No has publicado propiedades aún.</p>
      <a href="publicar.html" class="btn-primary" style="margin-top:16px;display:inline-flex">Publicar mi primera propiedad</a>
    </div>`;
    return;
  }

  grid.innerHTML = props.map(p => {
    const foto    = p.fotos?.[0] ? `<img src="${p.fotos[0]}" style="width:100%;height:100%;object-fit:cover">` : (p.tipo === 'casa' ? '🏠' : '🏢');
    const precio  = (p.precio || 0).toLocaleString('es-DO');
    const moneda  = p.moneda === 'DOP' ? 'RD$' : 'USD$';
    const sufijo  = p.modalidad === 'alquiler' ? '/mes' : '';
    const estadoClass = { disponible: 'status-disponible', pausada: 'status-pausada', vendida: 'status-vendida' }[p.estado] || 'status-disponible';
    const estadoLabel = { disponible: 'Disponible', pausada: 'Pausada', vendida: 'Vendida/Alquilada' }[p.estado] || 'Disponible';

    return `<div class="my-prop-card">
      <div class="my-prop-img">${foto}</div>
      <div class="my-prop-body">
        <div class="my-prop-head">
          <div>
            <p class="my-prop-price">${moneda} ${precio}${sufijo}</p>
            <h3 class="my-prop-title">${p.titulo}</h3>
            <p class="my-prop-loc">📍 ${p.direccion}</p>
          </div>
          <span class="status-badge ${estadoClass}">${estadoLabel}</span>
        </div>
        <div class="my-prop-stats">
          <span>👁 ${p.vistas || 0} vistas</span>
        </div>
        <div class="my-prop-actions">
          <a href="propiedad.html?id=${p.id}" class="btn-outline btn-sm">Ver</a>
          ${p.estado === 'disponible'
            ? `<button class="btn-danger btn-sm" onclick="pausarProp('${p.id}')">⏸ Pausar</button>`
            : `<button class="btn-primary btn-sm" onclick="activarProp('${p.id}')">▶ Activar</button>`}
          <button class="btn-danger btn-sm" onclick="eliminarProp('${p.id}')">🗑 Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function cargarFavoritos() {
  const ids   = await obtenerFavoritos();
  const grid  = $('favoritosGrid');
  $('statMsgs').textContent = ids.length; // reutilizamos el stat temporalmente

  if (!ids.length || !grid) return;

  // Obtener datos de cada propiedad favorita
  const props = await Promise.all(ids.map(id => db.collection('propiedades').doc(id).get()));
  const valid = props.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));

  grid.innerHTML = valid.map(p => {
    const foto   = p.fotos?.[0] ? `<img src="${p.fotos[0]}" style="width:100%;height:100%;object-fit:cover">` : (p.tipo === 'casa' ? '🏠' : '🏢');
    const precio = (p.precio || 0).toLocaleString('es-DO');
    const moneda = p.moneda === 'DOP' ? 'RD$' : 'USD$';
    const sufijo = p.modalidad === 'alquiler' ? '<small>/mes</small>' : '';
    return `<article class="prop-card">
      <div class="prop-img-wrap">
        <div class="prop-img-placeholder">${foto}</div>
        <div class="prop-badges">
          <span class="badge badge-${p.modalidad}">${p.modalidad === 'venta' ? 'Venta' : 'Alquiler'}</span>
        </div>
        <button class="fav-btn active" onclick="quitarFav('${p.id}', this)" title="Quitar">♥</button>
      </div>
      <div class="prop-body">
        <p class="prop-price">${moneda} ${precio} ${sufijo}</p>
        <h3 class="prop-title">${p.titulo}</h3>
        <p class="prop-location">📍 ${p.direccion}</p>
        <div class="prop-footer">
          <a href="propiedad.html?id=${p.id}" class="btn-card">Ver propiedad</a>
        </div>
      </div>
    </article>`;
  }).join('');
}

window.quitarFav = async function(propId, btn) {
  await toggleFavorito(propId);
  btn.closest('article')?.remove();
};

// ─── Tabs ───
function setupTabs() {
  document.querySelectorAll('.ptab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.ptab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      $(`tab-${btn.dataset.tab}`)?.classList.add('active');
    });
  });
}

// ─── Toggle contraseña ───
function setupPasswordToggles() {
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.input-pw-wrap')?.querySelector('input');
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });
}

// ─── Acciones ───
function setupAcciones() {

  // Guardar datos
  $('btnGuardarDatos')?.addEventListener('click', async () => {
    const nombre   = $('editNombre')?.value.trim()   || '';
    const telefono = $('editTelefono')?.value.trim() || '';
    const bio      = $('editBio')?.value.trim()      || '';
    if (!nombre) { alert('El nombre es requerido.'); return; }
    try {
      await actualizarPerfil({ nombre, telefono: '+1' + telefono.replace(/\D/g,''), bio });
      $('perfilNombre').textContent = nombre;
      showAlert('alertDatos', '✓ Datos guardados correctamente', 'success');
      setTimeout(() => $('alertDatos')?.classList.add('hidden'), 3000);
    } catch (err) {
      showAlert('alertDatos', 'Error al guardar: ' + err.message, 'error');
    }
  });

  // Avatar
  [$('avatarInput'), $('avatarInput2')].forEach(input => {
    input?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const url = await subirAvatar(file);
        const img = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        if ($('perfilAvatar'))  $('perfilAvatar').innerHTML  = img;
        if ($('avatarPreview')) $('avatarPreview').innerHTML = img;
      } catch (err) {
        alert('Error subiendo imagen: ' + err.message);
      }
    });
  });

  // Cambiar contraseña
  $('btnCambiarPw')?.addEventListener('click', async () => {
    const actual  = $('pwActual')?.value  || '';
    const nueva   = $('pwNueva')?.value   || '';
    const confirm = $('pwConfirm')?.value || '';

    if (!actual || !nueva) { showAlert('alertPw', 'Completa todos los campos.', 'error'); return; }
    if (nueva.length < 6)  { showAlert('alertPw', 'Mínimo 6 caracteres.', 'error'); return; }
    if (nueva !== confirm)  { showAlert('alertPw', 'Las contraseñas no coinciden.', 'error'); return; }

    try {
      const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, actual);
      await currentUser.reauthenticateWithCredential(cred);
      await currentUser.updatePassword(nueva);
      showAlert('alertPw', '✓ Contraseña cambiada exitosamente.', 'success');
      ['pwActual','pwNueva','pwConfirm'].forEach(id => { if ($(id)) $(id).value = ''; });
    } catch (err) {
      const msg = err.code === 'auth/wrong-password' ? 'Contraseña actual incorrecta.' : 'Error: ' + err.message;
      showAlert('alertPw', msg, 'error');
    }
  });

  // Eliminar cuenta
  $('btnEliminarCuenta')?.addEventListener('click', () => {
    mostrarModal('¿Eliminar tu cuenta?', 'Perderás todas tus propiedades, mensajes y favoritos. Esta acción es permanente.', async () => {
      try {
        await db.collection('users').doc(currentUser.uid).delete();
        await currentUser.delete();
        window.location.href = 'index.html';
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          alert('Por seguridad, cierra sesión, vuelve a entrar y luego elimina la cuenta.');
        }
      }
    });
  });
}

// ─── Acciones propiedades ───
window.pausarProp = async (id) => {
  mostrarModal('¿Pausar propiedad?', 'No será visible hasta que la reactives.', async () => {
    await actualizarPropiedad(id, { estado: 'pausada' });
    await cargarMisPropiedades();
  });
};
window.activarProp = async (id) => {
  await actualizarPropiedad(id, { estado: 'disponible' });
  await cargarMisPropiedades();
};
window.eliminarProp = (id) => {
  mostrarModal('¿Eliminar propiedad?', 'Esta acción no se puede deshacer.', async () => {
    await eliminarPropiedad(id);
    await cargarMisPropiedades();
  });
};

// ─── Modal ───
function mostrarModal(titulo, msg, onConfirm) {
  $('modalTitle').textContent = titulo;
  $('modalMsg').textContent   = msg;
  $('modalConfirm').classList.remove('hidden');
  $('modalConfirmBtn').onclick = () => {
    $('modalConfirm').classList.add('hidden');
    onConfirm();
  };
}

function showAlert(id, msg, type) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove('hidden');
}
