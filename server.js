/**
 * server.js — Backend principal de Veni Guapa
 *
 * Servidor Express que cumple tres roles:
 *   1. Sirve el frontend de la tienda (tienda/) y el panel admin (admin/)
 *   2. Expone una API REST para gestión de productos y categorías
 *   3. Maneja la subida de imágenes (Multer → Sharp → Firebase Storage)
 *
 * Autenticación: las rutas que modifican datos (POST/DELETE/PATCH)
 * requieren el header "x-admin-key" con el valor definido en ADMIN_KEY (.env).
 */

import express from "express";
import cors from "cors";
import multer from "multer";
import sharp from "sharp";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

// Necesario para usar __dirname con módulos ES (import/export en lugar de require)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NODE_ENV = process.env.NODE_ENV || 'development';
console.log('NODE_ENV =', NODE_ENV);

// ✅ Inicializar Firebase Admin con tu clave privada
// Lee credenciales desde ENV en producción, o desde archivo en local
let serviceAccount;
const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
if (saRaw) {
  try {
    // puede venir como JSON directo...
    serviceAccount = JSON.parse(saRaw);
  } catch {
    // ...o base64
    const decoded = Buffer.from(saRaw, "base64").toString("utf8");
    serviceAccount = JSON.parse(decoded);
  }
  // normaliza saltos de línea del private_key cuando viene desde ENV
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
} else {
  // desarrollo local: usa el archivo
  serviceAccount = JSON.parse(
    readFileSync(path.join(__dirname, "serviceAccountKey.json"), "utf8")
  );
}

const derivedBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  serviceAccount.storageBucket ||
  serviceAccount.storage_bucket ||
  (serviceAccount.project_id ? `${serviceAccount.project_id}.appspot.com` : "");

if (!derivedBucket) {
  throw new Error("No se pudo determinar el storageBucket. Configurá FIREBASE_STORAGE_BUCKET o verificá el serviceAccount.");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: derivedBucket
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Convierte la URL pública de una imagen de Firebase Storage en el path
 * interno del archivo dentro del bucket (ej: "productos/foto-123.webp").
 * Soporta tanto URLs del formato /o/ (API REST de Storage) como URLs directas.
 */
function resolveStoragePathFromUrl(imageUrl = "") {
  let filePath = imageUrl;
  if (filePath.includes("/o/")) {
    filePath = filePath.split("/o/")[1].split("?")[0];
  } else if (filePath.includes("/productos/")) {
    const [, rest] = filePath.split("/productos/");
    filePath = `productos/${(rest || "").split("?")[0]}`;
  }
  return decodeURIComponent(filePath);
}

/**
 * Elimina una imagen de Firebase Storage a partir de su URL pública.
 * No lanza error si el archivo no existe (puede ya haber sido eliminado).
 */
async function deleteImageFromUrl(imageUrl = "") {
  if (!imageUrl) return;
  try {
    const filePath = resolveStoragePathFromUrl(imageUrl);
    if (!filePath) return;
    const file = bucket.file(filePath);
    await file.delete();
    console.log("🧹 Imagen eliminada de Storage:", filePath);
  } catch (err) {
    console.warn("⚠️ No se pudo eliminar la imagen (puede no existir):", err.message);
  }
}

/**
 * Elimina un documento de producto de Firestore y su imagen asociada en Storage.
 * Acepta opcionalmente el snapshot ya cargado para evitar una lectura extra.
 * Lanza un error con code "PRODUCT_NOT_FOUND" si el documento no existe.
 */
async function deleteProductDocument(docRef, snapshot) {
  const snap = snapshot || await docRef.get();
  if (!snap.exists) {
    const err = new Error("Producto no encontrado");
    err.code = "PRODUCT_NOT_FOUND";
    err.status = 404;
    throw err;
  }
  const data = snap.data() || {};
  // Primero eliminar la imagen para no dejar archivos huérfanos en Storage
  if (data.imagen) {
    await deleteImageFromUrl(data.imagen);
  }
  await docRef.delete();
  return data;
}

const app = express();
const ADMIN_KEY = (process.env.ADMIN_KEY || "CAMBIA-ESTA-CLAVE").trim();
// 🔒 CORS restringido a orígenes permitidos
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://tienda-veni-guapa.onrender.com",
]);

const ALLOWED_HOSTS = new Set([
  "localhost:3000",
  "127.0.0.1:3000",
  "tienda-veni-guapa.onrender.com",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      // Requests same-origin (sin header Origin) o desde herramientas CLI
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(new Error("CORS: origin no permitido"), false);
    },
    methods: ["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-admin-key"],
    credentials: true,
  })
);
app.use(express.json());


// Carpeta pública principal (tienda)
app.use(express.static(path.join(__dirname, "tienda")));

// Carpeta del panel admin
app.use("/admin", express.static(path.join(__dirname, "admin")));

// Multer almacena el archivo en memoria (buffer) para pasárselo directamente
// a Sharp sin escribir archivos temporales en disco.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo por archivo
});

// 🚧 Guardia adicional por Origin/Referer para todas las rutas /api
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin || "";
  const referer = req.headers.referer || "";
  const hostHeader = req.headers.host || "";
  let permitido = false;

  if (origin && ALLOWED_ORIGINS.has(origin)) permitido = true;
  if (!permitido && referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (ALLOWED_ORIGINS.has(refOrigin)) permitido = true;
    } catch (_) { /* referer malformado: ignorar */ }
  }
  if (!permitido && hostHeader && ALLOWED_HOSTS.has(hostHeader)) {
    permitido = true;
  }

  if (!permitido) return res.status(403).json({ error: "Origen no permitido" });
  // 🔐 Requiere clave para operaciones que modifican el estado
  if (req.method === "POST" || req.method === "DELETE" || req.method === "PATCH") {
    const key = req.header("x-admin-key") || "";
    if (key !== ADMIN_KEY) {
      return res.status(401).json({ error: "No autorizado" });
    }
  }
  next();
});

// Verificar clave de administración
app.get("/api/auth/verify", (req, res) => {
  const key = (req.header("x-admin-key") || "").trim();
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: "Clave incorrecta" });
  }
  res.status(200).json({ ok: true });
});

// Health check rápido (no toca Firebase)
app.get("/healthz", (_req, res) => {
  res.status(200).json({
    ok: true,
    env: NODE_ENV,
    time: new Date().toISOString(),
  });
});

// Health check "profundo" (verifica Firestore y Storage)
app.get("/healthz/deep", async (_req, res) => {
  try {
    // Lectura mínima de Firestore
    await db.collection("productos").limit(1).get();
    // Listado mínimo de Storage
    await bucket.getFiles({ maxResults: 1 });

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/productos
 * Crea un nuevo producto con imagen.
 * Flujo: valida campos → verifica categoría en Firestore → optimiza imagen con Sharp
 *        → sube a Storage → guarda documento en Firestore con la URL pública.
 * Requiere multipart/form-data con campos: nombre, precio, categoria, imagen (file).
 */
app.post("/api/productos", upload.single("imagen"), async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || "").trim();
    const precio = String(req.body?.precio || "").trim();
    const categoria = String(req.body?.categoria || "").trim().toLowerCase();
    const file = req.file;

    if (!nombre || !precio || !categoria) {
      return res.status(400).json({ error: "Nombre, precio y categoría son obligatorios." });
    }

    // Verificar que la categoría exista en Firestore
    const catSnap = await db.collection("categorias").where("nombre", "==", categoria).limit(1).get();
    if (catSnap.empty) {
      return res.status(400).json({ error: `La categoría "${categoria}" no existe.` });
    }

    if (!file) return res.status(400).json({ error: "No se subió ninguna imagen" });

    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Solo se permiten archivos de imagen" });
    }

    // Optimizar imagen: convertir a WebP y redimensionar a máx. 1200px
    let processedBuffer;
    try {
      processedBuffer = await sharp(file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (err) {
      console.error("❌ Error al procesar la imagen con sharp:", err);
      return res.status(500).json({ error: "No se pudo procesar la imagen" });
    }

    // Generar un nombre único para evitar sobrescribir imágenes repetidas
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const baseName = file.originalname.replace(/\.[^/.]+$/, "");
    const filename = `${baseName}-${uniqueSuffix}.webp`;
    const blob = bucket.file(`productos/${filename}`);
    const blobStream = blob.createWriteStream({ metadata: { contentType: "image/webp" } });

    blobStream.on("error", (err) => res.status(500).json({ error: err.message }));

    blobStream.on("finish", async () => {
      try {
        await blob.makePublic();
        const encodedPath = blob.name.split('/').map(encodeURIComponent).join('/');
        const url = `https://storage.googleapis.com/${bucket.name}/${encodedPath}`;

        // Guardar datos del producto en Firestore y obtener su ID
        const docRef = await db.collection("productos").add({ nombre, precio, categoria, imagen: url });

        // Actualizar el documento con su propio ID
        await docRef.update({ id: docRef.id });

        // Devolver también el ID del documento recién creado
        res.json({ mensaje: "✅ Producto subido con éxito", id: docRef.id, imagen: url });
      } catch (err) {
        console.error("❌ Error al finalizar la subida:", err);
        res.status(500).json({ error: "Error al procesar la imagen subida" });
      }
    });

    blobStream.end(processedBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al subir producto" });
  }
});

/**
 * DELETE /api/productos/:id
 * Elimina un producto de Firestore y su imagen de Firebase Storage.
 * Usa deleteProductDocument() para garantizar que no queden imágenes huérfanas.
 */
app.delete("/api/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection("productos").doc(id);
    await deleteProductDocument(docRef);
    console.log(`✅ Producto ${id} eliminado correctamente`);
    res.json({ mensaje: "Producto eliminado correctamente" });
  } catch (error) {
    if (error.code === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    console.error("❌ Error al eliminar producto:", error);
    res.status(500).json({ error: "Error al eliminar el producto", detalle: error.message });
  }
});

/**
 * GET /api/categorias
 * Devuelve todas las categorías ordenadas por el campo "orden" (ascendente).
 * Si dos categorías tienen el mismo orden, se ordenan alfabéticamente.
 */
app.get("/api/categorias", async (_req, res) => {
  try {
    const snapshot = await db.collection("categorias").get();
    const categorias = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    categorias.sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999) || a.nombre.localeCompare(b.nombre));
    res.json(categorias);
  } catch (error) {
    console.error("Error listando categorías:", error);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

/**
 * POST /api/categorias
 * Crea una nueva categoría. El nombre se normaliza a minúsculas.
 * Asigna automáticamente el siguiente número de orden (maxOrden + 1)
 * para que aparezca al final en la lista de la tienda.
 */
app.post("/api/categorias", async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || "").trim().toLowerCase();
    if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

    const existe = await db.collection("categorias").where("nombre", "==", nombre).limit(1).get();
    if (!existe.empty) {
      return res.status(409).json({ error: "La categoría ya existe" });
    }

    const allCats = await db.collection("categorias").get();
    const maxOrden = allCats.docs.reduce((max, d) => Math.max(max, d.data().orden ?? 0), 0);

    const docRef = await db.collection("categorias").add({ nombre, orden: maxOrden + 1 });
    res.status(201).json({ id: docRef.id, nombre, orden: maxOrden + 1 });
  } catch (error) {
    console.error("Error creando categoría:", error);
    res.status(500).json({ error: "Error al crear la categoría" });
  }
});

/**
 * PATCH /api/categorias/:id
 * Actualiza el campo "orden" de una categoría.
 * El panel admin llama este endpoint para todas las categorías al mismo tiempo
 * cuando el usuario reordena con las flechas (↑/↓), normalizando todos los índices.
 */
app.patch("/api/categorias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const orden = req.body?.orden;
    if (typeof orden !== "number") {
      return res.status(400).json({ error: "Se requiere el campo 'orden' (número)." });
    }
    const ref = db.collection("categorias").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }
    await ref.update({ orden });
    res.json({ mensaje: "Orden actualizado" });
  } catch (error) {
    console.error("❌ Error actualizando orden de categoría:", error);
    res.status(500).json({ error: "Error al actualizar el orden" });
  }
});

/**
 * DELETE /api/categorias/:id
 * Elimina una categoría. Si tiene productos asociados:
 *   - Sin ?cascade=true: responde 409 con la cantidad de productos afectados.
 *   - Con ?cascade=true: elimina todos los productos y sus imágenes primero.
 * El panel admin muestra una segunda confirmación antes de hacer cascade.
 */
app.delete("/api/categorias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cascade = String(req.query.cascade || "").toLowerCase() === "true";
    const ref = db.collection("categorias").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    const nombre = (snap.data()?.nombre || "").toLowerCase();
    if (!nombre) {
      await ref.delete();
      return res.json({ mensaje: "Categoría eliminada" });
    }

    const productosSnap = await db.collection("productos").where("categoria", "==", nombre).get();
    const totalProductos = productosSnap.size;

    if (totalProductos > 0 && !cascade) {
      return res.status(409).json({
        error: "La categoría tiene productos asociados",
        productos: totalProductos
      });
    }

    let eliminados = 0;
    if (totalProductos > 0 && cascade) {
      for (const doc of productosSnap.docs) {
        try {
          await deleteProductDocument(doc.ref, doc);
          eliminados++;
        } catch (err) {
          if (err.code === "PRODUCT_NOT_FOUND") continue;
          throw err;
        }
      }
    }

    await ref.delete();
    const mensaje = eliminados > 0
      ? `Categoría eliminada junto con ${eliminados} producto(s)`
      : "Categoría eliminada";

    res.json({ mensaje, productosEliminados: eliminados });
  } catch (error) {
    console.error("Error eliminando categoría:", error);
    res.status(500).json({ error: "Error al eliminar la categoría" });
  }
});

/**
 * PATCH /api/productos/:id
 * Actualiza nombre, precio y/o categoría de un producto existente.
 * Solo actualiza los campos enviados en el body (los vacíos se ignoran).
 * Si se cambia la categoría, verifica que la nueva exista en Firestore.
 */
app.patch("/api/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = String(req.body?.nombre ?? "").trim();
    const precio = String(req.body?.precio ?? "").trim();
    const categoria = String(req.body?.categoria ?? "").trim().toLowerCase();

    if (!nombre && !precio && !categoria) {
      return res.status(400).json({ error: "Se requiere nombre, precio o categoría para actualizar." });
    }

    const docRef = db.collection("productos").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const updates = {};
    if (nombre) updates.nombre = nombre;
    if (precio) updates.precio = precio;
    if (categoria) {
      const catSnap = await db.collection("categorias").where("nombre", "==", categoria).limit(1).get();
      if (catSnap.empty) {
        return res.status(400).json({ error: `La categoría "${categoria}" no existe.` });
      }
      updates.categoria = categoria;
    }

    await docRef.update(updates);
    res.json({ mensaje: "Producto actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar producto:", error);
    res.status(500).json({ error: "Error al actualizar el producto", detalle: error.message });
  }
});

/**
 * GET /api/productos
 * Devuelve todos los productos de la colección (sin paginación).
 * Usado principalmente por el panel admin para mostrar el listado completo.
 * La tienda frontend usa onSnapshot() directamente con Firestore SDK en el cliente.
 */
app.get("/api/productos", async (_req, res) => {
  try {
    const snapshot = await db.collection("productos").get();
    const productos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
