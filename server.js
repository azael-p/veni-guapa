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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "veni-guapa.firebasestorage.app"
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const app = express();
const ADMIN_KEY = process.env.ADMIN_KEY || "CAMBIA-ESTA-CLAVE";
// 🔒 CORS restringido a orígenes permitidos
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://veni-guapa.onrender.com",
  "https://www.veni-guapa.onrender.com",
  // Agregá aquí tus dominios de producción cuando publiques, por ejemplo:
  // "https://veniguapa.com",
  // "https://www.veniguapa.com"
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
  let permitido = false;

  if (origin && ALLOWED_ORIGINS.has(origin)) permitido = true;
  if (!permitido && referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (ALLOWED_ORIGINS.has(refOrigin)) permitido = true;
    } catch (_) { /* referer malformado: ignorar */ }
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
    const { nombre, precio, categoria } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No se subió ninguna imagen" });

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
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const data = doc.data();

    if (data.imagen) {
      try {
        let filePath = data.imagen;

        // Si la URL contiene "/o/", extraer lo que viene después (caso típico de getDownloadURL)
        if (filePath.includes("/o/")) {
          filePath = filePath.split("/o/")[1].split("?")[0];
        } else if (filePath.includes("/productos/")) {
          // Si la URL es del tipo "https://storage.googleapis.com/bucket/productos/...”
          filePath = filePath.split("/productos/")[1].split("?")[0];
          filePath = `productos/${filePath}`;
        }

        filePath = decodeURIComponent(filePath);

        const file = bucket.file(filePath);
        await file.delete();

        console.log("🧹 Imagen eliminada de Storage:", filePath);
      } catch (err) {
        console.warn("⚠️ No se pudo eliminar la imagen (puede no existir):", err.message);
      }
    }

    // Eliminar documento de Firestore
    await docRef.delete();

    console.log(`✅ Producto ${id} eliminado correctamente`);
    res.json({ mensaje: "Producto eliminado correctamente" });

  } catch (error) {
    console.error("❌ Error al eliminar producto:", error);
    res.status(500).json({ error: "Error al eliminar el producto", detalle: error.message });
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
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));