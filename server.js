import express from "express";
import cors from "cors";
import multer from "multer";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Inicializar Firebase Admin con tu clave privada
const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "veni-guapa.firebasestorage.app"
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta pública principal (tienda)
app.use(express.static(path.join(__dirname, "tienda")));

// Carpeta del panel admin
app.use("/admin", express.static(path.join(__dirname, "admin")));

// Configuración de Multer (para recibir imágenes)
const upload = multer({ storage: multer.memoryStorage() });

// 📦 Endpoint para subir producto
app.post("/api/productos", upload.single("imagen"), async (req, res) => {
  try {
    const { nombre, precio, categoria } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No se subió ninguna imagen" });

    // Subir imagen a Firebase Storage
    const blob = bucket.file(`productos/${file.originalname}`);
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