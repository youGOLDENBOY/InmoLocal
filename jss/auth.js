/* ═══════════════════════════════════════════════════════════
   InmoLocal — auth.js
   Maneja login, registro y Google Auth
═══════════════════════════════════════════════════════════ */

// ─── Helpers UI ───
const $ = id => document.getElementById(id);

function setLoading(btnTextId, btnSpinnerId, isLoading) {
  const text    = $(btnTextId);
  const spinner = $(btnSpinnerId);
  if (!text || !spinner) return;
  text.classList.toggle('hidden', isLoading);
  spinner.classList.toggle('hidden', !isLoading);
}

function showAlert(id, msg, type = 'error') {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert(id) {
  const el = $(id);
  if (el) el.classList.add('hidden');
}

function setError(groupId, show) {
  const grp = $(groupId);
  if (!grp) return;
  grp.classList.toggle('has-error', show);
}

function translateError(code) {
  const map = {
    'auth/user-not-found':        'No existe una cuenta con ese correo.',
    'auth/wrong-password':        'Contraseña incorrecta.',
    'auth/invalid-email':         'El correo no es válido.',
    'auth/email-already-in-use':  'Ya existe una cuenta con ese correo.',
    'auth/weak-password':         'La contraseña es muy débil. Usa al menos 6 caracteres.',
    'auth/network-request-failed':'Sin conexión. Verifica tu internet.',
    'auth/too-many-requests':     'Demasiados intentos. Intenta más tarde.',
    'auth/popup-closed-by-user':  'Cerraste la ventana de Google. Intenta de nuevo.',
    'auth/invalid-credential':    'Correo o contraseña incorrectos.',
  };
  return map[code] || 'Ocurrió un error. Intenta de nuevo.';
}

// ─── Toggle mostrar/ocultar contraseña ───
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const wrap  = btn.closest('.input-pw-wrap');
    const input = wrap?.querySelector('input');
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? '🙈' : '👁';
  });
});

// ─── Redirigir si ya está logueado ───
// (Descomenta cuando Firebase esté conectado)
/*
auth.onAuthStateChanged(user => {
  if (user) {
    const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
    window.location.href = redirect;
  }
});
*/

// ════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════
const loginForm = $('loginForm');
if (loginForm) {

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertError');

    const email    = $('email')?.value.trim()    || '';
    const password = $('password')?.value        || '';
    let valid = true;

    // Validaciones
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setError('grpEmail', !emailOk);
    if (!emailOk) valid = false;

    if (password.length < 1) {
      setError('grpPassword', true);
      valid = false;
    } else {
      setError('grpPassword', false);
    }

    if (!valid) return;

    setLoading('btnLoginText', 'btnLoginSpinner', true);

    try {
      // ── Con Firebase conectado: ──
      // const cred = await auth.signInWithEmailAndPassword(email, password);
      // const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
      // window.location.href = redirect;

      // ── DEMO (sin Firebase): ──
      await new Promise(r => setTimeout(r, 1200));
      showAlert('alertError', '⚠️ Firebase no conectado. Abre js/firebase.js y agrega tu config.', 'error');

    } catch (err) {
      showAlert('alertError', translateError(err.code));
    } finally {
      setLoading('btnLoginText', 'btnLoginSpinner', false);
    }
  });

  // Google
  $('btnGoogle')?.addEventListener('click', async () => {
    try {
      // const provider = new firebase.auth.GoogleAuthProvider();
      // await auth.signInWithPopup(provider);
      // window.location.href = 'index.html';
      alert('Conecta Firebase para activar el login con Google.');
    } catch (err) {
      showAlert('alertError', translateError(err.code));
    }
  });
}

// ════════════════════════════════════════
//  REGISTRO
// ════════════════════════════════════════
const registerForm = $('registerForm');
if (registerForm) {

  // Medidor de fortaleza de contraseña
  $('password')?.addEventListener('input', () => {
    const pw   = $('password')?.value || '';
    const fill = $('pwFill');
    const label = $('pwLabel');
    if (!fill || !label) return;

    let strength = 0;
    if (pw.length >= 6)  strength++;
    if (pw.length >= 10) strength++;
    if (/[A-Z]/.test(pw)) strength++;
    if (/[0-9]/.test(pw)) strength++;
    if (/[^A-Za-z0-9]/.test(pw)) strength++;

    const levels = ['', 'Muy débil', 'Débil', 'Regular', 'Buena', 'Excelente'];
    const colors = ['', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#27ae60'];
    const pct    = Math.min((strength / 4) * 100, 100);

    fill.style.width      = pct + '%';
    fill.style.background = colors[strength] || '#ddd';
    label.textContent     = levels[strength] || '—';
    label.style.color     = colors[strength] || '#999';
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertError');
    hideAlert('alertSuccess');

    const nombre   = $('nombre')?.value.trim()    || '';
    const telefono = $('telefono')?.value.trim()  || '';
    const email    = $('email')?.value.trim()     || '';
    const password = $('password')?.value         || '';
    const confirm  = $('confirm')?.value          || '';
    const terminos = $('terminos')?.checked       || false;
    let valid = true;

    // Validaciones
    if (nombre.length < 2)       { setError('grpNombre',   true); valid = false; } else setError('grpNombre', false);
    if (!/^\d{7,15}$/.test(telefono.replace(/\D/g,''))) {
      setError('grpTelefono', true); valid = false;
    } else setError('grpTelefono', false);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setError('grpEmail', !emailOk);
    if (!emailOk) valid = false;

    if (password.length < 6)    { setError('grpPassword', true); valid = false; } else setError('grpPassword', false);
    if (password !== confirm)   { setError('grpConfirm',  true); valid = false; } else setError('grpConfirm', false);

    if (!terminos) {
      $('errTerminos')?.style.setProperty('display', 'block');
      valid = false;
    } else {
      $('errTerminos')?.style.setProperty('display', 'none');
    }

    if (!valid) return;

    setLoading('btnRegisterText', 'btnRegisterSpinner', true);

    try {
      // ── Con Firebase conectado: ──
      /*
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: nombre });
      await db.collection('users').doc(cred.user.uid).set({
        nombre,
        email,
        telefono: '+1' + telefono.replace(/\D/g,''),
        avatarUrl: '',
        rol: 'visitante',
        verificado: false,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.location.href = 'index.html';
      */

      // ── DEMO: ──
      await new Promise(r => setTimeout(r, 1500));
      showAlert('alertSuccess', '✓ Cuenta creada con éxito. (Demo — conecta Firebase para guardar datos reales)', 'success');

    } catch (err) {
      showAlert('alertError', translateError(err.code));
    } finally {
      setLoading('btnRegisterText', 'btnRegisterSpinner', false);
    }
  });

  // Google
  $('btnGoogle')?.addEventListener('click', async () => {
    try {
      // const provider = new firebase.auth.GoogleAuthProvider();
      // await auth.signInWithPopup(provider);
      // window.location.href = 'index.html';
      alert('Conecta Firebase para activar el registro con Google.');
    } catch (err) {
      showAlert('alertError', translateError(err.code));
    }
  });
}
