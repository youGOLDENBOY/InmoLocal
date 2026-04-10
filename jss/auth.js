/* ═══════════════════════════════════════════════════════════
   InmoLocal — auth.js
   Login, registro y Google — conectado a Firebase real
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

// ─── Helpers UI ───
function setLoading(textId, spinnerId, isLoading) {
  $(textId)?.classList.toggle('hidden', isLoading);
  $(spinnerId)?.classList.toggle('hidden', !isLoading);
}

function showAlert(id, msg, type = 'error') {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert(id) { $(id)?.classList.add('hidden'); }

function setError(groupId, show) { $(groupId)?.classList.toggle('has-error', show); }

function traducirError(code) {
  const map = {
    'auth/user-not-found':        'No existe una cuenta con ese correo.',
    'auth/wrong-password':        'Contraseña incorrecta.',
    'auth/invalid-email':         'El correo no es válido.',
    'auth/email-already-in-use':  'Ya existe una cuenta con ese correo.',
    'auth/weak-password':         'La contraseña debe tener al menos 6 caracteres.',
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
    const input = btn.closest('.input-pw-wrap')?.querySelector('input');
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type      = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? '🙈' : '👁';
  });
});

// ════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════
const loginForm = $('loginForm');
if (loginForm) {

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertError');

    const email    = $('email')?.value.trim() || '';
    const password = $('password')?.value     || '';
    let valid = true;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setError('grpEmail', !emailOk);
    if (!emailOk) valid = false;

    if (!password) { setError('grpPassword', true); valid = false; }
    else            setError('grpPassword', false);

    if (!valid) return;

    setLoading('btnLoginText', 'btnLoginSpinner', true);

    try {
      await iniciarSesion(email, password);
      const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
      window.location.href = redirect;
    } catch (err) {
      showAlert('alertError', traducirError(err.code));
    } finally {
      setLoading('btnLoginText', 'btnLoginSpinner', false);
    }
  });

  $('btnGoogle')?.addEventListener('click', async () => {
    try {
      await iniciarConGoogle();
      const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
      window.location.href = redirect;
    } catch (err) {
      showAlert('alertError', traducirError(err.code));
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
    const pw    = $('password')?.value || '';
    const fill  = $('pwFill');
    const label = $('pwLabel');
    if (!fill || !label) return;

    let strength = 0;
    if (pw.length >= 6)           strength++;
    if (pw.length >= 10)          strength++;
    if (/[A-Z]/.test(pw))         strength++;
    if (/[0-9]/.test(pw))         strength++;
    if (/[^A-Za-z0-9]/.test(pw))  strength++;

    const levels = ['', 'Muy débil', 'Débil', 'Regular', 'Buena', 'Excelente'];
    const colors = ['', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#27ae60'];
    fill.style.width      = Math.min((strength / 4) * 100, 100) + '%';
    fill.style.background = colors[strength] || '#ddd';
    label.textContent     = levels[strength] || '—';
    label.style.color     = colors[strength] || '#999';
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertError');
    hideAlert('alertSuccess');

    const nombre   = $('nombre')?.value.trim()   || '';
    const telefono = $('telefono')?.value.trim()  || '';
    const email    = $('email')?.value.trim()     || '';
    const password = $('password')?.value         || '';
    const confirm  = $('confirm')?.value          || '';
    const terminos = $('terminos')?.checked       || false;
    let valid = true;

    if (nombre.length < 2)       { setError('grpNombre',   true); valid = false; } else setError('grpNombre',   false);
    if (!/^\d{7,15}$/.test(telefono.replace(/\D/g, ''))) {
      setError('grpTelefono', true); valid = false;
    } else setError('grpTelefono', false);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setError('grpEmail', !emailOk);
    if (!emailOk) valid = false;

    if (password.length < 6) { setError('grpPassword', true); valid = false; } else setError('grpPassword', false);
    if (password !== confirm) { setError('grpConfirm',  true); valid = false; } else setError('grpConfirm',  false);

    if (!terminos) {
      $('errTerminos')?.style.setProperty('display', 'block');
      valid = false;
    } else {
      $('errTerminos')?.style.setProperty('display', 'none');
    }

    if (!valid) return;

    setLoading('btnRegisterText', 'btnRegisterSpinner', true);

    try {
      await registrarUsuario(email, password, nombre, telefono);
      window.location.href = 'index.html';
    } catch (err) {
      showAlert('alertError', traducirError(err.code));
    } finally {
      setLoading('btnRegisterText', 'btnRegisterSpinner', false);
    }
  });

  $('btnGoogle')?.addEventListener('click', async () => {
    try {
      await iniciarConGoogle();
      window.location.href = 'index.html';
    } catch (err) {
      showAlert('alertError', traducirError(err.code));
    }
  });
}
