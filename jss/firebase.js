/* ═══════════════════════════════════════════════════════════
   InmoLocal — firebase.js
   Configuración y helpers de Firebase
   
   PASOS PARA CONECTAR:
   1. Ve a https://console.firebase.google.com
   2. Crea un proyecto nuevo → "InmoLocal"
   3. Agrega una app Web (</>) → copia tu firebaseConfig
   4. Reemplaza el objeto firebaseConfig de abajo
   5. Activa: Authentication (Email/Google), Firestore, Storage
═══════════════════════════════════════════════════════════ */

// ─── 1. IMPORTAR Firebase (CDN — agregar en el <head> de cada HTML) ───
// <script type="module" src="js/firebase.js"></script>
// Agrega estos scripts ANTES en el HTML:
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js"></script>

// ─── 2. TU CONFIGURACIÓN (reemplazar con la tuya) ───
const firebaseConfig = {
  apiKey:            "TU_API_KEY",
  authDomain:        "inmoloca.firebaseapp.com",
  projectId:         "inmoloca",
  storageBucket:     "inmoloca.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};

// ─── 3. INICIALIZAR ───
// firebase.initializeApp(firebaseConfig);
// const db      = firebase.firestore();
// const auth    = firebase.auth();
// const storage = firebase.storage();

// ════════════════════════════════════════════════════
// ESTRUCTURA DE COLECCIONES EN FIRESTORE
// ════════════════════════════════════════════════════
/*
  /users/{userId}
    - nombre: string
    - email: string
    - telefono: string (WhatsApp)
    - avatarUrl: string
    - rol: "propietario" | "visitante"
    - creadoEn: timestamp
    - verificado: boolean

  /propiedades/{propiedadId}
    - titulo: string
    - descripcion: string
    - tipo: "casa" | "apartamento"
    - modalidad: "venta" | "alquiler"
    - precio: number
    - moneda: "DOP" | "USD"
    - habitaciones: number
    - banos: number
    - metrosCuadrados: number
    - direccion: string
    - sector: string
    - fotos: array<string>        (URLs de Storage, máx 10)
    - videos: array<string>       (URLs de Storage, máx 3)
    - propietarioId: string       (ref a users)
    - propietarioNombre: string
    - propietarioTelefono: string
    - estado: "disponible" | "vendido" | "alquilado"
    - destacada: boolean
    - vistas: number
    - creadaEn: timestamp
    - actualizadaEn: timestamp

  /chats/{chatId}
    - participantes: array<userId>       [comprador, vendedor]
    - propiedadId: string
    - ultimoMensaje: string
    - ultimaFecha: timestamp
    - noLeidos: {userId: number}

    /chats/{chatId}/mensajes/{msgId}
      - texto: string
      - autorId: string
      - fecha: timestamp
      - leido: boolean

  /anuncios/{anuncioId}
    - titulo: string
    - imagenUrl: string
    - linkDestino: string
    - posicion: "banner-top" | "sidebar" | "en-grid"
    - activo: boolean
    - fechaInicio: timestamp
    - fechaFin: timestamp
    - clicks: number

  /favoritos/{userId}/lista/{propiedadId}
    - propiedadId: string
    - guardadoEn: timestamp
*/

// ════════════════════════════════════════════════════
// FUNCIONES DE AUTENTICACIÓN
// ════════════════════════════════════════════════════

async function registrarUsuario(email, password, nombre, telefono) {
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(cred.user.uid).set({
      nombre,
      email,
      telefono,
      avatarUrl: '',
      rol: 'visitante',
      verificado: false,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
    await cred.user.updateProfile({ displayName: nombre });
    return { ok: true, user: cred.user };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function iniciarSesion(email, password) {
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return { ok: true, user: cred.user };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function iniciarConGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const cred = await auth.signInWithPopup(provider);
    // Crear perfil si es la primera vez
    const docRef = db.collection('users').doc(cred.user.uid);
    const snap = await docRef.get();
    if (!snap.exists) {
      await docRef.set({
        nombre: cred.user.displayName,
        email: cred.user.email,
        telefono: '',
        avatarUrl: cred.user.photoURL || '',
        rol: 'visitante',
        verificado: false,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    return { ok: true, user: cred.user };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function cerrarSesion() {
  return auth.signOut();
}

// ════════════════════════════════════════════════════
// FUNCIONES DE PROPIEDADES
// ════════════════════════════════════════════════════

async function obtenerPropiedades(filtros = {}) {
  try {
    let query = db.collection('propiedades').where('estado', '==', 'disponible');

    if (filtros.tipo)     query = query.where('tipo', '==', filtros.tipo);
    if (filtros.modalidad) query = query.where('modalidad', '==', filtros.modalidad);
    if (filtros.precioMax) query = query.where('precio', '<=', filtros.precioMax);

    query = query.orderBy('destacada', 'desc').orderBy('creadaEn', 'desc').limit(20);

    const snap = await query.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error obteniendo propiedades:', err);
    return [];
  }
}

async function obtenerPropiedad(id) {
  try {
    const doc = await db.collection('propiedades').doc(id).get();
    if (!doc.exists) return null;
    // Incrementar vistas
    db.collection('propiedades').doc(id).update({
      vistas: firebase.firestore.FieldValue.increment(1)
    });
    return { id: doc.id, ...doc.data() };
  } catch (err) {
    console.error('Error obteniendo propiedad:', err);
    return null;
  }
}

async function publicarPropiedad(datos, fotos, videos) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión');

    // Subir fotos (máx 10)
    const fotosUrls = [];
    for (let i = 0; i < Math.min(fotos.length, 10); i++) {
      const ref = storage.ref(`propiedades/${Date.now()}_foto_${i}`);
      await ref.put(fotos[i]);
      fotosUrls.push(await ref.getDownloadURL());
    }

    // Subir videos (máx 3, validar duración desde frontend)
    const videosUrls = [];
    for (let i = 0; i < Math.min(videos.length, 3); i++) {
      const ref = storage.ref(`propiedades/${Date.now()}_video_${i}`);
      await ref.put(videos[i]);
      videosUrls.push(await ref.getDownloadURL());
    }

    const docRef = await db.collection('propiedades').add({
      ...datos,
      fotos: fotosUrls,
      videos: videosUrls,
      propietarioId: user.uid,
      estado: 'disponible',
      destacada: false,
      vistas: 0,
      creadaEn: firebase.firestore.FieldValue.serverTimestamp(),
      actualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { ok: true, id: docRef.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════
// FUNCIONES DE CHAT
// ════════════════════════════════════════════════════

async function iniciarOAbrirChat(compradorId, vendedorId, propiedadId) {
  // Buscar si ya existe un chat entre estos dos para esta propiedad
  const snap = await db.collection('chats')
    .where('participantes', 'array-contains', compradorId)
    .where('propiedadId', '==', propiedadId)
    .get();

  const existente = snap.docs.find(d => d.data().participantes.includes(vendedorId));
  if (existente) return existente.id;

  // Crear nuevo chat
  const ref = await db.collection('chats').add({
    participantes: [compradorId, vendedorId],
    propiedadId,
    ultimoMensaje: '',
    ultimaFecha: firebase.firestore.FieldValue.serverTimestamp(),
    noLeidos: { [compradorId]: 0, [vendedorId]: 0 }
  });
  return ref.id;
}

async function enviarMensaje(chatId, texto) {
  const user = auth.currentUser;
  if (!user) return;

  const batch = db.batch();

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
    ultimaFecha: firebase.firestore.FieldValue.serverTimestamp()
  });

  await batch.commit();
}

function escucharMensajes(chatId, callback) {
  return db.collection('chats').doc(chatId)
    .collection('mensajes')
    .orderBy('fecha', 'asc')
    .onSnapshot(snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(msgs);
    });
}

// ════════════════════════════════════════════════════
// FUNCIONES DE ANUNCIOS
// ════════════════════════════════════════════════════

async function obtenerAnuncios(posicion) {
  const hoy = new Date();
  const snap = await db.collection('anuncios')
    .where('posicion', '==', posicion)
    .where('activo', '==', true)
    .where('fechaFin', '>=', hoy)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ════════════════════════════════════════════════════
// LISTENER DE AUTH GLOBAL
// ════════════════════════════════════════════════════

// Descomentar cuando Firebase esté conectado:
/*
auth.onAuthStateChanged(user => {
  const authGuest = document.getElementById('authGuest');
  const authUser  = document.getElementById('authUser');
  const avatarFallback = document.getElementById('avatarFallback');
  const userAvatar = document.getElementById('userAvatar');

  if (user) {
    authGuest?.classList.add('hidden');
    authUser?.classList.remove('hidden');

    if (user.photoURL) {
      userAvatar.src = user.photoURL;
    } else if (avatarFallback) {
      avatarFallback.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();
    }
  } else {
    authGuest?.classList.remove('hidden');
    authUser?.classList.add('hidden');
  }
});
*/

// Exportar funciones para usar en otras páginas
// (cuando uses <script type="module">)
// export { registrarUsuario, iniciarSesion, iniciarConGoogle, ... };

console.log('🔥 firebase.js cargado — conecta tu firebaseConfig para activar');
