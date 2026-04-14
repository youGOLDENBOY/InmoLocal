/* ═══════════════════════════════════════════════════════════
   InmoLocal — chat.js — Firebase real
   + Fix: noLeidos se resetea correctamente al abrir chat
   + Badge del navbar se actualiza en tiempo real
═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

let currentUser       = null;
let chatActualId      = null;
let unsubscribeMsgs   = null;
let unsubscribeChats  = null;

document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = 'login.html'; return; }
    currentUser = user;

    cargarChats(user.uid);
    setupInput();
    setupSearch();

    // Si viene desde propiedad.html con parámetros
    const params   = new URLSearchParams(window.location.search);
    const vendorId = params.get('vendor');
    const propId   = params.get('prop');
    const chatId   = params.get('chat');

    if (chatId) {
      // Viene directo con el chatId
      abrirChat(chatId);
    } else if (vendorId && propId) {
      iniciarOAbrirChat(vendorId, propId).then(id => abrirChat(id));
    }
  });
});

// ─── Cargar lista de conversaciones ───

function cargarChats(userId) {
  if (unsubscribeChats) unsubscribeChats();

  unsubscribeChats = escucharChats(userId, async (chats) => {
    const list = $('chatList');
    list.innerHTML = '';
    $('chatTotal').textContent = chats.length;

    if (!chats.length) {
      list.innerHTML = `
        <div class="chat-empty">
          <span>💬</span>
          <p>No tienes conversaciones aún.</p>
          <a href="index.html" class="btn-primary" style="margin-top:12px">Ver propiedades</a>
        </div>`;
      return;
    }

    for (const chat of chats) {
      const otroId = chat.participantes.find(id => id !== userId);
      let otroNombre = 'Usuario', propTitulo = '';

      try {
        const [userDoc, propDoc] = await Promise.all([
          db.collection('users').doc(otroId).get(),
          db.collection('propiedades').doc(chat.propiedadId).get()
        ]);
        otroNombre = userDoc.data()?.nombre || 'Usuario';
        propTitulo = propDoc.data()?.titulo  || '';
      } catch (_) {}

      const ini     = otroNombre[0]?.toUpperCase() || '?';
      const noLeido = chat.noLeidos?.[userId] || 0;
      const hora    = formatHora(chat.ultimaFecha?.toDate?.() || new Date());

      const item = document.createElement('div');
      item.className = `chat-item${chatActualId === chat.id ? ' active' : ''}`;
      item.dataset.chat = chat.id;
      item.innerHTML = `
        <div class="owner-avatar" style="background:var(--olive-light)">${ini}</div>
        <div class="chat-item-info">
          <p class="chat-item-name">${otroNombre}</p>
          <p class="chat-item-preview">${chat.ultimoMensaje || 'Sin mensajes aún'}</p>
          <p class="chat-item-prop">🏠 ${propTitulo}</p>
        </div>
        <div class="chat-item-meta">
          <span class="chat-time">${hora}</span>
          ${noLeido > 0 ? `<span class="chat-unread">${noLeido}</span>` : ''}
        </div>`;

      item.addEventListener('click', () =>
        abrirChat(chat.id, otroNombre, ini, propTitulo, chat.propiedadId)
      );

      list.appendChild(item);
    }
  });
}

// ─── Abrir conversación ───

window.abrirChat = async function(chatId, nombre, ini, propTitulo, propId) {
  if (chatActualId === chatId) return;

  // Si solo recibimos el ID, obtener datos del chat
  if (!nombre) {
    try {
      const chatDoc  = await db.collection('chats').doc(chatId).get();
      const chatData = chatDoc.data();
      if (!chatData) return;
      const otroId = chatData.participantes.find(id => id !== currentUser.uid);
      const [userDoc, propDoc] = await Promise.all([
        db.collection('users').doc(otroId).get(),
        db.collection('propiedades').doc(chatData.propiedadId).get()
      ]);
      nombre    = userDoc.data()?.nombre || 'Usuario';
      propTitulo = propDoc.data()?.titulo || '';
      propId    = chatData.propiedadId;
      ini       = nombre[0]?.toUpperCase() || '?';
    } catch (err) {
      console.error('Error abriendo chat:', err);
      return;
    }
  }

  chatActualId = chatId;

  // Marcar activo en lista
  document.querySelectorAll('.chat-item').forEach(el => {
    el.classList.toggle('active', el.dataset.chat === chatId);
    // Limpiar badge visual de este chat
    if (el.dataset.chat === chatId) {
      el.querySelector('.chat-unread')?.remove();
    }
  });

  // Llenar header
  $('winAvatar').textContent  = ini;
  $('winName').textContent    = nombre;
  $('winProp').textContent    = `🏠 ${propTitulo}`;
  $('winPropLink').href       = `propiedad.html?id=${propId}`;

  // Mostrar ventana de chat
  $('chatEmptyState').classList.add('hidden');
  $('chatWindow').classList.remove('hidden');
  $('chatSidebar').classList.add('hidden-mobile');

  // Escuchar mensajes en tiempo real
  if (unsubscribeMsgs) unsubscribeMsgs();
  unsubscribeMsgs = escucharMensajes(chatId, (msgs) => {
    renderMensajes(msgs);
  });

  // ── FIX: Resetear noLeidos del usuario actual a 0 ──
  try {
    await db.collection('chats').doc(chatId).update({
      [`noLeidos.${currentUser.uid}`]: 0
    });
  } catch (err) {
    console.error('Error reseteando noLeidos:', err);
  }
};

// ─── Render mensajes ───

function renderMensajes(mensajes) {
  const container = $('chatMessages');
  if (!container) return;

  const eraBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 60;
  container.innerHTML = '';

  mensajes.forEach((msg, i) => {
    const fecha     = msg.fecha?.toDate?.() || new Date();
    const prevFecha = mensajes[i - 1]?.fecha?.toDate?.();

    if (i === 0 || !mismoDia(prevFecha, fecha)) {
      const sep = document.createElement('div');
      sep.className   = 'chat-date-sep';
      sep.textContent = formatFechaSep(fecha);
      container.appendChild(sep);
    }

    const div = document.createElement('div');
    div.className = `msg ${msg.autorId === currentUser.uid ? 'sent' : 'recv'}`;
    div.innerHTML = `
      <div class="msg-bubble">${escapeHtml(msg.texto)}</div>
      <span class="msg-time">${formatHora(fecha)}</span>`;
    container.appendChild(div);
  });

  if (eraBottom) scrollToBottom();
}

// ─── Enviar mensaje ───

function setupInput() {
  const input   = $('chatInput');
  const sendBtn = $('chatSendBtn');

  const enviar = async () => {
    const texto = input?.value.trim();
    if (!texto || !chatActualId) return;
    input.value = '';
    try {
      await enviarMensaje(chatActualId, texto);
    } catch (err) {
      console.error('Error enviando:', err);
    }
  };

  sendBtn?.addEventListener('click', enviar);
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  });
}

// ─── Búsqueda de conversaciones ───

function setupSearch() {
  $('chatSearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.chat-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

// ─── Botón volver (móvil) ───

$('btnBackMobile')?.addEventListener('click', () => {
  $('chatSidebar').classList.remove('hidden-mobile');
  $('chatEmptyState').classList.remove('hidden');
  $('chatWindow').classList.add('hidden');
  chatActualId = null;
  if (unsubscribeMsgs) unsubscribeMsgs();
});

// ─── Helpers ───

function scrollToBottom() {
  const msgs = $('chatMessages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function formatHora(fecha) {
  if (!fecha) return '';
  return fecha.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
}

function formatFechaSep(fecha) {
  const hoy  = new Date();
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  if (mismoDia(fecha, hoy))  return 'Hoy';
  if (mismoDia(fecha, ayer)) return 'Ayer';
  return fecha.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });
}

function mismoDia(a, b) {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function escapeHtml(t) {
  return (t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
