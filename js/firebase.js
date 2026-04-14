/* ═══════════════════════════════════════════════════════════
   InmoLocal — firebase.js
   Config real conectada — proyecto: proyectotenshi
   + Badge de notificaciones en navbar
═══════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: "AIzaSyCGkSJdNj6veRnnD6Mr0xXIJQ9JxD3FESU",
  authDomain: "proyectotenshi.firebaseapp.com",
  projectId: "proyectotenshi",
  storageBucket: "proyectotenshi.firebasestorage.app",
  messagingSenderId: "728795278216",
  appId: "1:728795278216:web:9f4d546fb1fd3dc9eb683d"
};

firebase.initializeApp(firebaseConfig);

const db      = firebase.firestore();
const auth    = firebase.auth();
const storage = firebase.storage();

// ════════════════════════════════════════════════════
// BADGE DE NOTIFICACIONES — mensajes no leídos
// ════════════════════════════════════════════════════

let _unsubscribeBadge = null;

function iniciarBadgeNotificaciones(userId) {
  // Cancelar listener anterior si existía
  if (_unsubscribeBadge) _unsubscribeBadge();

  _unsubscribeBadge = db.collection('chats')
    .where('participantes', 'array-contains', userId)
    .onSnapshot(snap => {
      let total = 0;
      snap.docs.forEach(doc => {
        const data = doc.data();
        total += data.noLeidos?.[userId] || 0;
      });
      actualizarBadgeUI(total);
    });
}

function detenerBadgeNotificaciones() {
  if (_unsubscribeBadge) {
    _unsubscribeBadge();
    _unsubscribeBadge = null;
  }
  actualizarBadgeUI(0);
}

function actualizarBadgeUI(count) {
  // Busca todos los elementos badge en el navbar (desktop + mobile)
  document.querySelectorAll('.notif-badge').forEach(el => {
    if (count > 0) {
      el.textContent = count > 99 ? '99+' : count;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

// ════════════════════════════════════════════════════
// AUTH — LISTENER GLOBAL
// ════════════════════════════════════════════════════

auth.onAuthStateChanged(async (user) => {
  const authGuest    = document.getElementById('authGuest');
  const authUser     = document.getElementById('authUser');
  const avatarFallback = document.getElementById('avatarFallback');
  const navAvatar    = document.getElementById('navAvatar');

  if (user) {
    authGuest?.classList.add('hidden');
    authUser?.classList.remove('hidden');

    const ini = (user.displayName || user.email || 'U')[0].toUpperCase();
    if (avatarFallback) avatarFallback.textContent = ini;
    if (navAvatar) navAvatar.textContent = ini;

    // ── Foto de perfil real ──
    try {
      const perfDoc = await db.collection('users').doc(user.uid).get();
      const foto = perfDoc.data()?.avatarUrl || user.photoURL;
      if (foto) {
        const imgHTML = `<img src="${foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        if (avatarFallback) avatarFallback.innerHTML = imgHTML;
        if (navAvatar) navAvatar.innerHTML = imgHTML;
        const mobileAv = document.getElementById('mobileAvatar');
        if (mobileAv) mobileAv.innerHTML = imgHTML;
      }
    } catch (_) {}

    // ── Iniciar badge de notificaciones ──
    iniciarBadgeNotificaciones(user.uid);

    // Redirigir fuera de login/registro si ya está autenticado
    const page = window.location.pathname;
    if (page.includes('login.html') || page.includes('registro.html')) {
      const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
      window.location.href = redirect;
      return;
    }

  } else {
    authGuest?.classList.remove('hidden');
    authUser?.classList.add('hidden');

    // Detener badge
    detenerBadgeNotificaciones();

    const protegidas = ['publicar.html', 'chat.html', 'perfil.html'];
    const page = window.location.pathname;
    if (protegidas.some(p => page.includes(p))) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
  }

  if (typeof actualizarNavbar === 'function') actualizarNavbar(user);
});

// ════════════════════════════════════════════════════
// AUTENTICACIÓN
// ════════════════════════════════════════════════════

async function registrarUsuario(email, password, nombre, telefono) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await cred.user.updateProfile({ displayName: nombre });
  await db.collection('users').doc(cred.user.uid).set({
    nombre,
    email,
    telefono: '+1' + telefono.replace(/\D/g, ''),
    avatarUrl: '',
    rol: 'visitante',
    verificado: false,
    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
  });
  return cred.user;
}

async function iniciarSesion(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

async function iniciarConGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  const cred = await auth.signInWithPopup(provider);
  const snap = await db.collection('users').doc(cred.user.uid).get();
  if (!snap.exists) {
    await db.collection('users').doc(cred.user.uid).set({
      nombre: cred.user.displayName || '',
      email: cred.user.email,
      telefono: '',
      avatarUrl: cred.user.photoURL || '',
      rol: 'visitante',
      verificado: false,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  return cred.user;
}

async function cerrarSesion() {
  await auth.signOut();
  window.location.href = 'index.html';
}

// ════════════════════════════════════════════════════
// PROPIEDADES
// ════════════════════════════════════════════════════

async function obtenerPropiedades(filtros = {}, limite = 20) {
  let query = db.collection('propiedades').where('estado', '==', 'disponible');
  if (filtros.tipo)      query = query.where('tipo', '==', filtros.tipo);
  if (filtros.modalidad) query = query.where('modalidad', '==', filtros.modalidad);
  query = query.orderBy('destacada', 'desc').orderBy('creadaEn', 'desc').limit(limite);
  const snap = await query.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function obtenerPropiedad(id) {
  const doc = await db.collection('propiedades').doc(id).get();
  if (!doc.exists) return null;
  db.collection('propiedades').doc(id).update({
    vistas: firebase.firestore.FieldValue.increment(1)
  });
  return { id: doc.id, ...doc.data() };
}

async function publicarPropiedad(datos, fotos, videos, onProgress) {
  const user = auth.currentUser;
  if (!user) throw new Error('Debes iniciar sesión');
  const userDoc  = await db.collection('users').doc(user.uid).get();
  const userData = userDoc.data() || {};

  const fotosUrls = [];
  for (let i = 0; i < Math.min(fotos.length, 10); i++) {
    onProgress?.(`Subiendo foto ${i + 1}/${fotos.length}...`, ((i + 1) / fotos.length) * 60);
    const ref  = storage.ref(`propiedades/${user.uid}_${Date.now()}_foto${i}`);
    const snap = await ref.put(fotos[i]);
    fotosUrls.push(await snap.ref.getDownloadURL());
  }

  const videosUrls = [];
  for (let i = 0; i < Math.min(videos.length, 3); i++) {
    onProgress?.(`Subiendo video ${i + 1}/${videos.length}...`, 60 + ((i + 1) / videos.length) * 35);
    const ref  = storage.ref(`propiedades/${user.uid}_${Date.now()}_video${i}`);
    const snap = await ref.put(videos[i]);
    videosUrls.push(await snap.ref.getDownloadURL());
  }

  onProgress?.('Guardando publicación...', 98);
  const ref = await db.collection('propiedades').add({
    ...datos,
    fotos: fotosUrls,
    videos: videosUrls,
    propietarioId: user.uid,
    propietarioNombre: userData.nombre || user.displayName || '',
    propietarioTelefono: datos.mostrarTelefono ? (userData.telefono || '') : '',
    estado: 'disponible',
    destacada: false,
    vistas: 0,
    creadaEn: firebase.firestore.FieldValue.serverTimestamp(),
    actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
  });
  onProgress?.('¡Publicado!', 100);
  return ref.id;
}

async function actualizarPropiedad(id, datos) {
  await db.collection('propiedades').doc(id).update({
    ...datos,
    actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function eliminarPropiedad(id) {
  await db.collection('propiedades').doc(id).delete();
}

async function obtenerMisPropiedades() {
  const user = auth.currentUser;
  if (!user) return [];
  const snap = await db.collection('propiedades')
    .where('propietarioId', '==', user.uid)
    .orderBy('creadaEn', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ════════════════════════════════════════════════════
// FAVORITOS
// ════════════════════════════════════════════════════

async function toggleFavorito(propiedadId) {
  const user = auth.currentUser;
  if (!user) return null;
  const ref  = db.collection('favoritos').doc(user.uid).collection('lista').doc(propiedadId);
  const snap = await ref.get();
  if (snap.exists) { await ref.delete(); return false; }
  await ref.set({ propiedadId, guardadoEn: firebase.firestore.FieldValue.serverTimestamp() });
  return true;
}

async function obtenerFavoritos() {
  const user = auth.currentUser;
  if (!user) return [];
  const snap = await db.collection('favoritos').doc(user.uid).collection('lista').get();
  return snap.docs.map(d => d.id);
}

// ════════════════════════════════════════════════════
// CHAT
// ════════════════════════════════════════════════════

async function iniciarOAbrirChat(vendedorId, propiedadId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Inicia sesión para chatear');

  const snap = await db.collection('chats')
    .where('participantes', 'array-contains', user.uid)
    .where('propiedadId', '==', propiedadId)
    .get();

  const existente = snap.docs.find(d => d.data().participantes.includes(vendedorId));
  if (existente) return existente.id;

  const ref = await db.collection('chats').add({
    participantes: [user.uid, vendedorId],
    propiedadId,
    ultimoMensaje: '',
    ultimaFecha: firebase.firestore.FieldValue.serverTimestamp(),
    noLeidos: { [user.uid]: 0, [vendedorId]: 0 }
  });
  return ref.id;
}

async function enviarMensaje(chatId, texto) {
  const user = auth.currentUser;
  if (!user) return;

  // Obtener el chat para saber quién es el otro participante
  const chatDoc = await db.collection('chats').doc(chatId).get();
  const chatData = chatDoc.data();
  const otroId = chatData.participantes.find(id => id !== user.uid);

  const batch  = db.batch();
  const msgRef = db.collection('chats').doc(chatId).collection('mensajes').doc();

  batch.set(msgRef, {
    texto,
    autorId: user.uid,
    fecha: firebase.firestore.FieldValue.serverTimestamp(),
    leido: false
  });

  const chatRef = db.collection('chats').doc(chatId);
  batch.update(chatRef, {
    ultimoMensaje: texto,
    ultimaFecha: firebase.firestore.FieldValue.serverTimestamp(),
    // ── NUEVO: incrementar noLeidos del receptor ──
    [`noLeidos.${otroId}`]: firebase.firestore.FieldValue.increment(1)
  });

  await batch.commit();
}

function escucharMensajes(chatId, callback) {
  return db.collection('chats').doc(chatId)
    .collection('mensajes')
    .orderBy('fecha', 'asc')
    .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

function escucharChats(userId, callback) {
  return db.collection('chats')
    .where('participantes', 'array-contains', userId)
    .orderBy('ultimaFecha', 'desc')
    .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// ════════════════════════════════════════════════════
// ANUNCIOS
// ════════════════════════════════════════════════════

async function obtenerAnuncios(posicion) {
  const hoy  = new Date();
  const snap = await db.collection('anuncios')
    .where('posicion', '==', posicion)
    .where('activo', '==', true)
    .get();

  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(a => {
      const fin = a.fechaFin?.toDate?.() || new Date(a.fechaFin);
      return fin >= hoy;
    });
}

async function registrarClickAnuncio(anuncioId) {
  await db.collection('anuncios').doc(anuncioId).update({
    clicks: firebase.firestore.FieldValue.increment(1)
  });
}

// ════════════════════════════════════════════════════
// USUARIO
// ════════════════════════════════════════════════════

async function obtenerPerfil(uid) {
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function actualizarPerfil(datos) {
  const user = auth.currentUser;
  if (!user) return;
  await db.collection('users').doc(user.uid).update({
    ...datos,
    actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
  });
  if (datos.nombre) await user.updateProfile({ displayName: datos.nombre });
}

async function subirAvatar(file) {
  const user = auth.currentUser;
  if (!user) return null;
  const ref  = storage.ref(`avatars/${user.uid}`);
  const snap = await ref.put(file);
  const url  = await snap.ref.getDownloadURL();
  await user.updateProfile({ photoURL: url });
  await db.collection('users').doc(user.uid).update({ avatarUrl: url });
  return url;
}

// ─── Botón logout global ───
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await cerrarSesion();
});

console.log('🔥 Firebase conectado — proyecto: proyectotenshi');
