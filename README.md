# 🏠 InmoLocal — Plataforma de Bienes Raíces Local

## Estructura del proyecto

```
inmobiliaria/
├── index.html              ← Página principal ✅
├── css/
│   ├── main.css            ← Estilos globales, navbar, hero, footer ✅
│   └── components.css      ← Tarjetas, formularios, chat, auth ✅
├── js/
│   ├── main.js             ← Interactividad UI ✅
│   └── firebase.js         ← Config + helpers Firebase ✅ (listo para conectar)
└── img/
    └── avatar-placeholder.png
```

## Páginas por construir (Fase 2)

| Archivo            | Descripción                          |
|--------------------|--------------------------------------|
| `login.html`       | Formulario de inicio de sesión       |
| `registro.html`    | Formulario de registro               |
| `publicar.html`    | Formulario para publicar propiedad   |
| `propiedad.html`   | Detalle de una propiedad             |
| `chat.html`        | Chat entre comprador y vendedor      |
| `perfil.html`      | Perfil del usuario                   |
| `mis-propiedades.html` | Lista de propiedades del dueño   |
| `favoritos.html`   | Propiedades guardadas                |
| `anunciar.html`    | Formulario para comprar anuncio      |

## Cómo conectar Firebase

1. Ve a https://console.firebase.google.com
2. Crea proyecto "InmoLocal"
3. Agrega app Web → copia tu `firebaseConfig`
4. Pega la config en `js/firebase.js`
5. Activa:
   - **Authentication** → Email/Contraseña + Google
   - **Firestore** → Modo producción
   - **Storage** → Para fotos y videos

## Reglas de Firestore (copiar en Firebase Console)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Propiedades: cualquiera puede leer, solo el dueño edita
    match /propiedades/{id} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.propietarioId;
    }
    // Usuarios: solo tú puedes editar tu perfil
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    // Chat: solo participantes
    match /chats/{chatId} {
      allow read, write: if request.auth.uid in resource.data.participantes;
      match /mensajes/{msgId} {
        allow read, write: if request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participantes;
      }
    }
    // Anuncios: solo lectura pública
    match /anuncios/{id} {
      allow read: if true;
      allow write: if false; // Solo admin desde consola
    }
  }
}
```

## Reglas de Storage

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /propiedades/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.resource.size < 50 * 1024 * 1024; // máx 50MB por archivo
    }
  }
}
```

## Paleta de colores

| Variable        | Color      | Uso                       |
|-----------------|------------|---------------------------|
| `--cream`       | `#F5F0E8`  | Fondo principal           |
| `--olive`       | `#2D3B2D`  | Color dominante / botones |
| `--gold`        | `#C8A55A`  | Acentos / precios         |
| `--wpp`         | `#25D366`  | Botón de WhatsApp         |

## Tipografías

- **Display:** Cormorant Garamond (títulos elegantes)
- **Body:** DM Sans (texto limpio y legible)
