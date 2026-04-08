/* ═══════════════════════════════════════════════════════════
   InmoLocal — perfil.js
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

// ─── Demo user ───
const DEMO_USER = {
  nombre: 'Sam Pérez',
  email: 'sam@ejemplo.com',
  telefono: '8090000000',
  bio: '',
  avatarUrl: '',
};

document.addEventListener('DOMContentLoaded', () => {
  cargarPerfil(DEMO_USER);
  setupTabs();
  setupPasswordToggles();
  setupFavBtns();
  setupAcciones();

  // CON FIREBASE:
  // auth.onAuthStateChanged(async user => {
  //   if (!user) { window.location.href = 'login.html'; return; }
  //   const doc = await db.collection('users').doc(user.uid).get();
  //   cargarPerfil({ ...doc.data(), uid: user.uid });
  // });
});

// ─── Cargar datos en UI ───
function cargarPerfil(user) {
  const ini = (user.nombre || user.email || 'U')[0].toUpperCase();

  $('perfilAvatar').textContent = ini;
  $('navAvatar').textContent    = ini;
  $('perfilNombre').textContent = user.nombre || 'Tu nombre';
  $('perfilEmail').textContent  = user.email  || '';
  $('avatarPreview').textContent = ini;

  // Rellenar formulario datos
  if ($('editNombre'))   $('editNombre').value   = user.nombre   || '';
  if ($('editEmail'))    $('editEmail').value     = user.email    || '';
  if ($('editTelefono')) $('editTelefono').value  = user.telefono || '';
  if ($('editBio'))      $('editBio').value       = user.bio      || '';

  // Stats (demo)
  $('statProps').textContent  = '2';
  $('statVistas').textContent = '65';
  $('statMsgs').textContent   = '4';
}

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

// ─── Toggle password ───
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

// ─── Fav buttons ───
function setupFavBtns() {
  document.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      btn.classList.toggle('active');
      btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
    });
  });
}

// ─── Acciones ───
function setupAcciones() {

  // Guardar datos personales
  $('btnGuardarDatos')?.addEventListener('click', async () => {
    const nombre   = $('editNombre')?.value.trim()   || '';
    const telefono = $('editTelefono')?.value.trim() || '';
    const bio      = $('editBio')?.value.trim()      || '';

    if (!nombre) { alert('El nombre es requerido.'); return; }

    // CON FIREBASE:
    // const user = auth.currentUser;
    // await db.collection('users').doc(user.uid).update({ nombre, telefono: '+1'+telefono.replace(/\D/g,''), bio, actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() });
    // await user.updateProfile({ displayName: nombre });

    $('perfilNombre').textContent = nombre;
    showAlert('alertDatos', '✓ Datos guardados correctamente', 'success');
    setTimeout(() => $('alertDatos')?.classList.add('hidden'), 3000);
  });

  // Cambiar contraseña
  $('btnCambiarPw')?.addEventListener('click', async () => {
    const actual   = $('pwActual')?.value   || '';
    const nueva    = $('pwNueva')?.value    || '';
    const confirm  = $('pwConfirm')?.value  || '';

    if (!actual || !nueva) { showAlert('alertPw', 'Completa todos los campos.', 'error'); return; }
    if (nueva.length < 6)  { showAlert('alertPw', 'La nueva contraseña debe tener al menos 6 caracteres.', 'error'); return; }
    if (nueva !== confirm)  { showAlert('alertPw', 'Las contraseñas no coinciden.', 'error'); return; }

    // CON FIREBASE:
    // try {
    //   const user = auth.currentUser;
    //   const cred = firebase.auth.EmailAuthProvider.credential(user.email, actual);
    //   await user.reauthenticateWithCredential(cred);
    //   await user.updatePassword(nueva);
    //   showAlert('alertPw', '✓ Contraseña cambiada exitosamente.', 'success');
    //   ['pwActual','pwNueva','pwConfirm'].forEach(id => $(id) && ($(id).value = ''));
    // } catch(err) {
    //   showAlert('alertPw', err.code === 'auth/wrong-password' ? 'Contraseña actual incorrecta.' : 'Error: ' + err.message, 'error');
    // }

    showAlert('alertPw', '✓ Contraseña cambiada. (Demo — conecta Firebase)', 'success');
  });

  // Cambiar foto de avatar
  [$('avatarInput'), $('avatarInput2')].forEach(input => {
    input?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
        $('perfilAvatar').innerHTML = '';
        $('perfilAvatar').appendChild(img.cloneNode());
        $('avatarPreview')?.replaceChildren(img);
      };
      reader.readAsDataURL(file);
      // CON FIREBASE: subir a storage y actualizar perfil
    });
  });

  // Eliminar cuenta
  $('btnEliminarCuenta')?.addEventListener('click', () => {
    mostrarModal(
      '¿Eliminar tu cuenta?',
      'Perderás todas tus propiedades, mensajes y favoritos. Esta acción es permanente.',
      async () => {
        // CON FIREBASE: await auth.currentUser.delete()
        alert('Cuenta eliminada. (Demo)');
        window.location.href = 'index.html';
      }
    );
  });

  // Logout
  $('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    // CON FIREBASE: await auth.signOut();
    window.location.href = 'index.html';
  });
}

// ─── Acciones propiedades ───
window.editarPropiedad = function(id) {
  window.location.href = `publicar.html?editar=${id}`;
};
window.pausarPropiedad = function(id) {
  mostrarModal('¿Pausar propiedad?', 'La propiedad no será visible hasta que la reactives.', () => {
    // CON FIREBASE: db.collection('propiedades').doc(id).update({ estado: 'pausada' });
    alert('Propiedad pausada. (Demo)');
    location.reload();
  });
};
window.activarPropiedad = function(id) {
  // CON FIREBASE: db.collection('propiedades').doc(id).update({ estado: 'disponible' });
  alert('Propiedad activada. (Demo)');
  location.reload();
};
window.eliminarPropiedad = function(id) {
  mostrarModal('¿Eliminar propiedad?', 'Esta acción no se puede deshacer. Todas las fotos y mensajes se perderán.', async () => {
    // CON FIREBASE: await db.collection('propiedades').doc(id).delete();
    alert('Propiedad eliminada. (Demo)');
    location.reload();
  });
};

// ─── Modal de confirmación ───
function mostrarModal(titulo, msg, onConfirm) {
  $('modalTitle').textContent = titulo;
  $('modalMsg').textContent   = msg;
  $('modalConfirm').classList.remove('hidden');

  const btn = $('modalConfirmBtn');
  btn.onclick = () => {
    $('modalConfirm').classList.add('hidden');
    onConfirm();
  };
}

// ─── Helper alertas ───
function showAlert(id, msg, type) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove('hidden');
}
