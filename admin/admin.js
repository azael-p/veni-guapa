import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAOUw1KysaVxC2YFyAGUvIgK2dYRZwh-3s",
    authDomain: "veni-guapa.firebaseapp.com",
    projectId: "veni-guapa",
    storageBucket: "veni-guapa.appspot.com",      
    messagingSenderId: "961134304703",
    appId: "1:961134304703:web:a3f19b7d9b9d5bac0a950a",
    measurementId: "G-0YVHTRLK9N"
};

// 🌐 URL del servidor: usa el mismo origen en producción (Render) y localhost en desarrollo
const host = window.location.hostname;
const isLocal = host === 'localhost' || host === '127.0.0.1';
const SERVER_URL = isLocal ? 'http://localhost:3000' : window.location.origin;
const ADMIN_TOKEN_KEY = 'vg_admin_key';
function adminHeaders() {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    const base = { 'Accept': 'application/json' };
    return token ? { ...base, 'x-admin-key': token } : base;
}
function ensureAuth() {
    const hasToken = !!localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!hasToken && !location.pathname.endsWith('/login.html')) {
        window.location.replace('/admin/login.html');
    }
}
ensureAuth();
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Exponer para otros módulos/scripts si hiciera falta
window.db = db;

if (!firebaseConfig || String(firebaseConfig.apiKey || '').includes('TU_')) {
    console.warn('⚠️ Configuración de Firebase incompleta en admin.html');
}

const form = document.getElementById("formProducto");

// Tomar la instancia de Firestore expuesta por el script de módulo
if (!db) {
    console.error('Firestore (db) no está disponible. Verifica la configuración de Firebase arriba.');
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const precio = document.getElementById("precio").value;
    const categoria = document.getElementById("categoria").value;
    const imagen = document.getElementById("imagen").files[0];

    if (!imagen) {
        alert("Seleccioná una imagen antes de continuar");
        return;
    }

    const formData = new FormData();
    formData.append("nombre", nombre);
    formData.append("precio", precio);
    formData.append("categoria", categoria);
    formData.append("imagen", imagen);

    try {
        const respuesta = await fetch(`${SERVER_URL}/api/productos`, {
        method: "POST",
        headers: adminHeaders(),
        body: formData
        });

        if (respuesta.status === 401) {
            alert('🔒 No autorizado. Ingresá de nuevo.');
            localStorage.removeItem(ADMIN_TOKEN_KEY);
            window.location.href = '/admin/login.html';
            return;
        }

        let data = {};
        try {
            const ct = respuesta.headers.get('content-type') || '';
            data = ct.includes('application/json') ? await respuesta.json() : {};
        } catch (_) {}

        if (respuesta.ok) {
            alert(data.mensaje || "✅ Producto subido con éxito");
            form.reset();
        } else {
            alert("⚠️ Error al subir producto: " + (data.error || `HTTP ${respuesta.status}`));
        }
    } catch (error) {
        console.error("Error:", error);
        alert("❌ No se pudo conectar con el servidor");
    }
});

function cargarProductos(filtro = "todas") {
    const lista = document.getElementById("listaProductos");
    lista.innerHTML = "<p>Cargando...</p>";

    if (!db) {
        console.warn("Firestore aún no está listo. Reintentando...");
        setTimeout(() => cargarProductos(filtro), 100);
        return;
    }

    const productosRef = collection(db, "productos");

    onSnapshot(
        productosRef,
        (snapshot) => {
        lista.innerHTML = "";

        if (snapshot.empty) {
            lista.innerHTML = "<p>No hay productos aún.</p>";
            return;
        }

        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const productosFiltrados = filtro === "todas"
            ? data
            : data.filter(p => p.categoria === filtro);

        const productosPorCategoria = {};
        productosFiltrados.forEach((producto) => {
            if (!productosPorCategoria[producto.categoria]) {
            productosPorCategoria[producto.categoria] = [];
            }
            productosPorCategoria[producto.categoria].push(producto);
        });

        for (const categoria in productosPorCategoria) {
            const categoriaDiv = document.createElement("div");
            categoriaDiv.className = "categoria-admin";
            categoriaDiv.innerHTML = `<h2>${categoria.charAt(0).toUpperCase() + categoria.slice(1)}</h2>`;

            productosPorCategoria[categoria].forEach((producto) => {
            const { id, nombre, precio, imagen } = producto;
            const div = document.createElement("div");
            div.className = "producto-item";
            div.innerHTML = `
                <img src="${imagen}" alt="${nombre}">
                <div>
                <strong>${nombre}</strong> - ${precio}
                </div>
                <button class="eliminar" data-id="${id}">Eliminar</button>
            `;
            categoriaDiv.appendChild(div);
            });

            lista.appendChild(categoriaDiv);
        }
        },
        (error) => {
        console.error('Error leyendo Firestore:', error);
        lista.innerHTML = `<p style="color:#a83939">No se pudo cargar la lista ( ${error.code || ''} ). Revisa la configuración/RULES.</p>`;
        }
    );
}

// --- Eliminar producto ---
document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("eliminar")) {
    const id = e.target.dataset.id;
    if (!confirm("¿Seguro que querés eliminar este producto?")) return;

    const res = await fetch(`${SERVER_URL}/api/productos/${id}`, {
        method: "DELETE",
        headers: adminHeaders()
    });
    if (res.status === 401) {
        alert('🔒 No autorizado. Ingresá de nuevo.');
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        window.location.href = '/admin/login.html';
        return;
    }
    let data = {};
    try {
        data = await res.json();
    } catch {
        data = { mensaje: "Producto eliminado correctamente" };
    }
    alert(data.mensaje || "Producto eliminado correctamente");
    }   
});

// --- CATEGORÍAS DINÁMICAS ---

import { addDoc, deleteDoc, doc, getDocs, collection as colRef } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const categoriaSelect = document.getElementById("categoria");
const filtroSelect = document.getElementById("filtroCategoria");
const listaCategorias = document.getElementById("listaCategorias");
const formCategoria = document.getElementById("formCategoria");

// Cargar categorías existentes
async function cargarCategorias() {
    const snapshot = await getDocs(colRef(db, "categorias"));
    const categorias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Limpiar selects
    categoriaSelect.innerHTML = "<option value='' disabled selected>Seleccionar categoría</option>";
    filtroSelect.innerHTML = "<option value='todas'>Todas</option>";
    listaCategorias.innerHTML = "";

    categorias.sort((a, b) => a.nombre.localeCompare(b.nombre));

    categorias.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.nombre;
        option.textContent = cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1);
        categoriaSelect.appendChild(option);

        const filtroOption = option.cloneNode(true);
        filtroSelect.appendChild(filtroOption);

        // Mostrar en lista
        const li = document.createElement("li");
        li.textContent = cat.nombre;
        const btn = document.createElement("button");
        btn.textContent = "Eliminar";
        btn.style.marginLeft = "10px";
        btn.addEventListener("click", async () => {
            if (confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) {
                await deleteDoc(doc(db, "categorias", cat.id));
                cargarCategorias();
            }
        });
        li.appendChild(btn);
        listaCategorias.appendChild(li);
    });
}

// Agregar nueva categoría
formCategoria.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("nuevaCategoria").value.trim().toLowerCase();
    if (!nombre) return alert("Ingresá un nombre de categoría");
    const snapshot = await getDocs(colRef(db, "categorias"));
    const existe = snapshot.docs.some(d => d.data().nombre === nombre);
    if (existe) return alert("Esa categoría ya existe.");
    await addDoc(colRef(db, "categorias"), { nombre });
    formCategoria.reset();
    cargarCategorias();
});

// --- Cargar productos al iniciar ---
document.addEventListener("DOMContentLoaded", () => {
    const filtro = document.getElementById("filtroCategoria");
    if (filtro) {
        filtro.addEventListener("change", () => cargarProductos(filtro.value));
    }
    cargarProductos();
    cargarCategorias();
});
