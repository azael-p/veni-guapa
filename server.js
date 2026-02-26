import express from "express";
import cors from "cors";
import multer from "multer";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NODE_ENV = process.env.NODE_ENV || 'development';
console.log('NODE_ENV =', NODE_ENV);
const isProd = NODE_ENV === 'production';

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

async function deleteProductDocument(docRef, snapshot) {
  const snap = snapshot || await docRef.get();
  if (!snap.exists) {
    const err = new Error("Producto no encontrado");
    err.code = "PRODUCT_NOT_FOUND";
    err.status = 404;
    throw err;
  }
  const data = snap.data() || {};
  if (data.imagen) {
    await deleteImageFromUrl(data.imagen);
  }
  await docRef.delete();
  return data;
}

const DEFAULT_CATEGORIES = ["remeras", "blazers", "pantalones", "vestidos", "accesorios"];

const app = express();
const ADMIN_KEY = process.env.ADMIN_KEY || "CAMBIA-ESTA-CLAVE";
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
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-admin-key"],
    credentials: true,
  })
);
app.use(express.json());


// Carpeta pública principal (tienda)
app.use(express.static(path.join(__dirname, "tienda")));

// Carpeta del panel admin
app.use("/admin", express.static(path.join(__dirname, "admin")));

// Configuración de Multer (para recibir imágenes)
const upload = multer({ storage: multer.memoryStorage() });

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
  if (req.method === "POST" || req.method === "DELETE") {
    const key = req.header("x-admin-key") || "";
    if (key !== ADMIN_KEY) {
      return res.status(401).json({ error: "No autorizado" });
    }
  }
  next();
});

// Health check rápido (no toca Firebase)
app.get("/healthz", (req, res) => {
  res.status(200).json({
    ok: true,
    env: NODE_ENV,
    time: new Date().toISOString(),
  });
});

// Health check "profundo" (verifica Firestore y Storage)
app.get("/healthz/deep", async (req, res) => {
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

// 📦 Endpoint para subir producto
app.post("/api/productos", upload.single("imagen"), async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || "").trim();
    const precio = String(req.body?.precio || "").trim();
    const categoria = String(req.body?.categoria || "").trim().toLowerCase();
    const file = req.file;

    if (!nombre || !precio || !categoria) {
      return res.status(400).json({ error: "Nombre, precio y categoría son obligatorios." });
    }

    if (!file) return res.status(400).json({ error: "No se subió ninguna imagen" });

    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Solo se permiten archivos de imagen" });
    }

    // Generar un nombre único para evitar sobrescribir imágenes repetidas
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = file.originalname.split('.').pop();
    const baseName = file.originalname.replace(/\.[^/.]+$/, "");
    const filename = `${baseName}-${uniqueSuffix}.${extension}`;
    const blob = bucket.file(`productos/${filename}`);
    const blobStream = blob.createWriteStream({ metadata: { contentType: file.mimetype } });

    blobStream.on("error", (err) => res.status(500).json({ error: err.message }));

    blobStream.on("finish", async () => {
      const [url] = await blob.getSignedUrl({ action: "read", expires: "03-01-2030" });

      // Guardar datos del producto en Firestore y obtener su ID
      const docRef = await db.collection("productos").add({ nombre, precio, categoria, imagen: url });

      // Actualizar el documento con su propio ID
      await docRef.update({ id: docRef.id });

      // Devolver también el ID del documento recién creado
      res.json({ mensaje: "✅ Producto subido con éxito", id: docRef.id, imagen: url });
    });

    blobStream.end(file.buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al subir producto" });
  }
});

// 🗑️ Endpoint para eliminar producto
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

// 📂 Categorías
app.get("/api/categorias", async (_req, res) => {
  try {
    let snapshot = await db.collection("categorias").orderBy("nombre").get();

    if (snapshot.empty && DEFAULT_CATEGORIES.length) {
      await Promise.all(
        DEFAULT_CATEGORIES.map(async (nombre) => {
          await db.collection("categorias").add({ nombre });
        })
      );
      snapshot = await db.collection("categorias").orderBy("nombre").get();
    }

    const categorias = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(categorias);
  } catch (error) {
    console.error("Error listando categorías:", error);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

app.post("/api/categorias", async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || "").trim().toLowerCase();
    if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

    const existe = await db.collection("categorias").where("nombre", "==", nombre).limit(1).get();
    if (!existe.empty) {
      return res.status(409).json({ error: "La categoría ya existe" });
    }

    const docRef = await db.collection("categorias").add({ nombre });
    res.status(201).json({ id: docRef.id, nombre });
  } catch (error) {
    console.error("Error creando categoría:", error);
    res.status(500).json({ error: "Error al crear la categoría" });
  }
});

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

// 📦 Obtener todos los productos
app.get("/api/productos", async (req, res) => {
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
