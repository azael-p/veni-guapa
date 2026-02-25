# Vení Guapa

Aplicación full-stack ligera para catálogos de indumentaria. Combina un sitio público estático (HTML/CSS/JS), un panel privado para alta/baja de productos y un backend Express que expone APIs seguras sobre Firebase (Firestore + Storage).

## Stack principal

- **Frontend tienda**: HTML5 + CSS3 + JavaScript vanilla con animaciones, carruseles y modal de zoom.
- **Panel admin**: HTML/CSS + módulo JS (`admin/admin.js`) que usa Firebase Web SDK para listar/filtrar.
- **Backend**: Node 18, Express 5, Multer, firebase-admin, CORS estricto y subida de archivos a Cloud Storage.
- **Infra**: Firebase Project (Firestore en modo producción + Storage) y cualquier hosting Node (Render, Railway, VPS, etc.).

## Arquitectura

```
/tienda        Sitio público servido como estático desde Express
/admin         Panel privado + login que guarda la clave en localStorage
server.js      API REST: productos y categorías + healthchecks
Firebase       Firestore (colecciones productos/categorias) y Storage/productos
```

- El backend sirve `/tienda` en la raíz y `/admin` como subruta. Todas las rutas `/api/*` verifican **origen permitido** y requieren el header `x-admin-key` para operaciones de escritura.
- Las imágenes se suben vía `multer` a memoria y luego a `gs://<bucket>/productos/...`. Al eliminar un producto también se limpia la imagen asociada.
- Tanto la tienda (`/tienda/scripts.js`) como el panel (`/admin/admin.js`) escuchan colecciones de Firestore en tiempo real para renderizar los carruseles y la lista administrativa.

## Requisitos previos

1. **Node.js 18+** y `npm`.
2. **Proyecto Firebase** con:
   - Firestore Database creada en modo production.
   - Cloud Storage habilitado (ruta `productos/`).
   - Cuenta de servicio con rol *Firebase Admin SDK Administrator Service Agent* (descargar JSON).
3. Clave de administración que se usará en el login del panel y como header `x-admin-key` en las APIs.

## Configuración local

1. Clonar e instalar dependencias:

   ```bash
   git clone https://github.com/azael-p/veni-guapa.git
   cd veni-guapa
   npm install
   ```

2. Configurar variables en `/Users/azaelpignanessi/WebstormProjects/Veni-Guapa/.env` (no se versiona):

   ```env
   ADMIN_KEY=super-secreta
   NODE_ENV=development
   FIREBASE_STORAGE_BUCKET=tu-bucket.appspot.com
   # O bien pegar el JSON de la cuenta de servicio en una sola línea/base64
   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}
   ```

   > Alternativa: dejar `FIREBASE_SERVICE_ACCOUNT` vacío y colocar el archivo descargado como `/Users/azaelpignanessi/WebstormProjects/Veni-Guapa/serviceAccountKey.json`.

3. Actualizar el snippet `const firebaseConfig = { ... }` en `/Users/azaelpignanessi/WebstormProjects/Veni-Guapa/tienda/scripts.js` y `/Users/azaelpignanessi/WebstormProjects/Veni-Guapa/admin/admin.js` con los valores del proyecto recién creado en Firebase Console.

4. (Opcional) Ajustar `ALLOWED_ORIGINS` y `ADMIN_KEY` en `/Users/azaelpignanessi/WebstormProjects/Veni-Guapa/server.js` antes de desplegar.

## Ejecución

```bash
npm start        # inicia Express en http://localhost:3000
```

- `GET /` muestra la tienda pública.
- `GET /admin/login.html` pide la clave (`ADMIN_KEY`) y guarda el token en localStorage.
- `POST /api/productos` permite subir imágenes + datos (protegido por clave y CORS).
- `DELETE /api/productos/:id` borra Firestore y la imagen en Storage.
- `GET /api/categorias` autogenera categorías base si la colección está vacía.

## Flujo recomendado

1. Levantar el servidor local (`npm start`).
2. Entrar a `/admin/login.html`, guardar la clave y usar el formulario para crear productos (nombre, precio, categoría + imagen).
3. Validar que los carruseles en la tienda muestren los nuevos documentos en tiempo real.
4. Usar el selector de categorías del panel para filtrar o eliminar registros.

## Deploy sugerido

1. Crear un servicio en Render/Railway con Node 18, subir el repo y setear las variables de entorno (`ADMIN_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_STORAGE_BUCKET`, `NODE_ENV=production`).
2. Habilitar HTTPS en el dominio y añadirlo al array `ALLOWED_ORIGINS` de `server.js`.
3. Opcional: servir únicamente la carpeta `/tienda` desde un CDN y dejar solo las APIs en Express.

## Roadmap

- Autenticación real (Firebase Auth o JWT) en lugar del token manual.
- Generación de URLs firmadas con vencimiento corto.
- Tests automáticos para endpoints y scripts front.
- Integración con servicios de mailing o notificaciones cuando se agregan productos.

## Licencia

Proyecto personal de práctica (ISC). Podés utilizarlo como base educativa; recordá reemplazar las claves antes de publicarlo.
