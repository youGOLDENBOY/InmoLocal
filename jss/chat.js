/* ═══════════════════════════════════════════════════════════
   InmoLocal — chat.js
   Chat en tiempo real con Firebase Firestore
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

// Estado actual
let chatActualId   = null;
let unsubscribeMsgs = null; // para cancelar el listener de mensajes
const DEMO_USER_ID = 'demo_yo';

// Demo data de chats
const DEMO_CHATS = {
  '1': {
    nombre: 'Juan Pérez',
    propTitulo: '🏠 Casa amplia con patio',
    propId: '1',
    telefono: '+18095550000',
    avatar: 'J',
    color: 'var(--olive-light)',
    mensajes: [
      { id: 'm1', texto: 'Hola, vi tu propiedad en InmoLocal. Me interesa la casa. ¿Está disponible?', autorId: 'otro', fecha: new Date(Date.now() - 30*60*1000) },
      { id: 'm2', texto: '¡Hola! Sí, está disponible. ¿Tienes alguna pregunta específica?', autorId: DEMO_USER_ID, fecha: new Date(Date.now() - 27*60*1000) },
      { id: 'm3', texto: '¿Está disponible para visita el sábado? Somos una familia de 4.', autorId: 'otro', fecha: new Date(Date.now() - 15*60*1000) },
    ]
  },
  '2': {
    nombre: 'María López',
    propTitulo: '🏢 Apartamento moderno',
    propId: '2',
    telefono: '+18095550001',
    avatar: 'M',
    color: '#5A7A9C',
    mensajes: [
      { id: 'm1', texto: '¿El apartamento incluye los muebles?', autorId: DEMO_USER_ID, fecha: new Date(Date.now() - 86400000) },
      { id: 'm2', texto: 'El precio incluye los muebles de la sala.', autorId: 'otro', fecha: new Date(Date.now() - 85000000) },
    ]
  },
  '3': {
    nombre: 'Roberto Díaz',
    propTitulo: '🏡 Villa con piscina',
    propId: '3',
    telefono: '+18095550002',
    avatar: 'R',
    color: '#7A5C8A',
    mensajes: [
      { id: 'm1', texto: '¿Podemos visitar la villa el lunes por la mañana?', autorId: DEMO_USER_ID, fecha: new Date(Date.now() - 2*86400000) },
      { id: 'm2', texto: 'Perfecto, nos vemos el lunes entonces. A las 10am.', autorId: 'otro', fecha: new Date(Date.now() - 86400000*2 + 3600000) },
    ]
  }
};

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  // Verificar auth (en demo mostramos todo)
  // auth.onAuthStateChanged(user => {
  //   if (!user) { window.location.href = 'login.html'; return; }
  //   cargarChats(user.uid);
  // });

  cargarChatsDemo();
  setupInput();
  setupSearch();

  // Si viene con params (desde propiedad.html)
  const params = new URLSearchParams(window.location.search);
  const chatId = params.get('chat');
  if (chatId && DEMO_CHATS[chatId]) {
    abrirChat(chatId);
  }
});

// ─── Cargar lista de chats ───
function cargarChatsDemo() {
  const total = Object.keys(DEMO_CHATS).length;
  $('chatTotal').textContent = total;
}

// CON FIREBASE:
/*
async function cargarChats(userId) {
  db.collection('chats')
    .where('participantes', 'array-contains', userId)
    .orderBy('ultimaFecha', 'desc')
    .onSnapshot(snap => {
      const list = $('chatList');
      list.innerHTML = '';
      if (snap.empty) {
        $('chatEmpty').classList.remove('hidden');
        return;
      }
      snap.docs.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        list.appendChild(crearChatItem(data, userId));
      });
      $('chatTotal').textContent = snap.docs.length;
    });
}
*/

// ─── Abrir chat ───
window.abrirChat = function(chatId) {
  chatActualId = chatId;
  const chat = DEMO_CHATS[chatId];
  if (!chat) return;

  // Marcar activo en lista
  document.querySelectorAll('.chat-item').forEach(el => {
    el.classList.toggle('active', el.dataset.chat === chatId);
  });

  // Quitar badge de no leídos
  const badge = document.querySelector(`[data-chat="${chatId}"] .chat-unread`);
  if (badge) badge.remove();

  // Llenar header
  $('winAvatar').textContent   = chat.avatar;
  $('winAvatar').style.background = chat.color;
  $('winName').textContent     = chat.nombre;
  $('winProp').textContent     = chat.propTitulo;
  $('winPropLink').href        = `propiedad.html?id=${chat.propId}`;

  const msg = encodeURIComponent(`Hola ${chat.nombre}, continuamos la conversación de InmoLocal.`);
  $('winWppBtn').href = `https://wa.me/${chat.telefono.replace(/\D/g,'')}?text=${msg}`;

  // Mostrar ventana
  $('chatEmptyState').classList.add('hidden');
  $('chatWindow').classList.remove('hidden');

  // Cargar mensajes
  renderMensajesDemo(chat.mensajes);

  // Móvil: ocultar sidebar
  $('chatSidebar').classList.add('hidden-mobile');
};

// ─── Render mensajes ───
function renderMensajesDemo(mensajes) {
  const container = $('chatMessages');
  container.innerHTML = '';

  mensajes.forEach((msg, i) => {
    // Separador de fecha
    if (i === 0 || !mismoDia(mensajes[i-1].fecha, msg.fecha)) {
      const sep = document.createElement('div');
      sep.className = 'chat-date-sep';
      sep.textContent = formatFechaSep(msg.fecha);
      container.appendChild(sep);
    }

    const div = document.createElement('div');
    div.className = `msg ${msg.autorId === DEMO_USER_ID ? 'sent' : 'recv'}`;
    div.innerHTML = `
      <div class="msg-bubble">${escapeHtml(msg.texto)}</div>
      <span class="msg-time">${formatHora(msg.fecha)}</span>
    `;
    container.appendChild(div);
  });

  scrollToBottom();
}

// CON FIREBASE (tiempo real):
/*
function escucharMensajes(chatId, userId) {
  if (unsubscribeMsgs) unsubscribeMsgs(); // cancelar listener anterior

  unsubscribeMsgs = db.collection('chats').doc(chatId)
    .collection('mensajes')
    .orderBy('fecha', 'asc')
    .onSnapshot(snap => {
      const container = $('chatMessages');
      container.innerHTML = '';

      snap.docs.forEach((doc, i) => {
        const msg = { id: doc.id, ...doc.data() };
        const fecha = msg.fecha?.toDate() || new Date();

        if (i === 0 || !mismoDia(snap.docs[i-1].data().fecha?.toDate(), fecha)) {
          const sep = document.createElement('div');
          sep.className = 'chat-date-sep';
          sep.textContent = formatFechaSep(fecha);
          container.appendChild(sep);
        }

        const div = document.createElement('div');
        div.className = `msg ${msg.autorId === userId ? 'sent' : 'recv'}`;
        div.innerHTML = `
          <div class="msg-bubble">${escapeHtml(msg.texto)}</div>
          <span class="msg-time">${formatHora(fecha)}</span>
        `;
        container.appendChild(div);
      });

      scrollToBottom();
    });
}
*/

// ─── Enviar mensaje ───
function setupInput() {
  const input  = $('chatInput');
  const sendBtn = $('chatSendBtn');

  const enviar = () => {
    const texto = input.value.trim();
    if (!texto || !chatActualId) return;

    // CON FIREBASE:
    // enviarMensajeFirebase(chatActualId, texto);

    // DEMO: agregar localmente
    const chat = DEMO_CHATS[chatActualId];
    const nuevoMsg = { id: `m_${Date.now()}`, texto, autorId: DEMO_USER_ID, fecha: new Date() };
    chat.mensajes.push(nuevoMsg);
    renderMensajesDemo(chat.mensajes);

    // Actualizar preview en lista
    const preview = document.querySelector(`[data-chat="${chatActualId}"] .chat-item-preview`);
    if (preview) preview.textContent = texto;

    input.value = '';
    input.focus();

    // Simular respuesta automática en demo
    simularRespuesta(chatActualId);
  };

  sendBtn.addEventListener('click', enviar);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  });

  // Indicador de escritura simulado
  let typingTimer;
  input.addEventListener('input', () => {
    // CON FIREBASE: actualizar campo "escribiendo" en Firestore
    clearTimeout(typingTimer);
  });
}

// Demo: simular respuesta del otro usuario
function simularRespuesta(chatId) {
  const respuestas = [
    '¡Gracias por tu mensaje! Te respondo en breve.',
    'Claro, con mucho gusto.',
    '¿Cuándo te viene bien para una visita?',
    'El precio es negociable si hay seriedad.',
    'Me comunico contigo mañana.',
  ];

  setTimeout(() => {
    $('typingIndicator')?.classList.remove('hidden');
    scrollToBottom();

    setTimeout(() => {
      $('typingIndicator')?.classList.add('hidden');
      const chat = DEMO_CHATS[chatId];
      const resp = { id: `m_${Date.now()}`, texto: respuestas[Math.floor(Math.random()*respuestas.length)], autorId: 'otro', fecha: new Date() };
      chat.mensajes.push(resp);
      renderMensajesDemo(chat.mensajes);
    }, 1800);
  }, 800);
}

// ─── Búsqueda en lista ───
function setupSearch() {
  $('chatSearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.chat-item').forEach(item => {
      const name = item.querySelector('.chat-item-name')?.textContent.toLowerCase() || '';
      const prop = item.querySelector('.chat-item-prop')?.textContent.toLowerCase()  || '';
      item.style.display = (name.includes(q) || prop.includes(q)) ? '' : 'none';
    });
  });
}

// ─── Botón volver (móvil) ───
$('btnBackMobile')?.addEventListener('click', () => {
  $('chatSidebar').classList.remove('hidden-mobile');
  $('chatEmptyState').classList.remove('hidden');
  $('chatWindow').classList.add('hidden');
});

// ─── Helpers ───
function scrollToBottom() {
  const msgs = $('chatMessages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function formatHora(fecha) {
  if (!fecha) return '';
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
}

function formatFechaSep(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const hoy = new Date();
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  if (mismoDia(d, hoy))  return 'Hoy';
  if (mismoDia(d, ayer)) return 'Ayer';
  return d.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });
}

function mismoDia(a, b) {
  if (!a || !b) return false;
  const da = a instanceof Date ? a : new Date(a);
  const db2 = b instanceof Date ? b : new Date(b);
  return da.toDateString() === db2.toDateString();
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
