import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDjMHUZNLuyANjNgZRDdEYI2vhWw0QJrck",
    authDomain: "veni-guapa-a6d74.firebaseapp.com",
    projectId: "veni-guapa-a6d74",
    storageBucket: "veni-guapa-a6d74.firebasestorage.app",
    messagingSenderId: "163522581569",
    appId: "1:163522581569:web:10d92da46d2b17614162c0",
    measurementId: "G-6PMCYPVTWQ"
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
        } catch (_) { }

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

            const productosFiltrados = (filtro === "todas" || !filtro)
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

        try {
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

            const payload = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg = payload.error || payload.mensaje || `HTTP ${res.status}`;
                alert(`⚠️ No se pudo eliminar el producto: ${msg}`);
                return;
            }

            alert(payload.mensaje || "Producto eliminado correctamente");
        } catch (err) {
            console.error("Error eliminando producto:", err);
            alert("❌ No se pudo conectar con el servidor. Intentá nuevamente.");
        }
    }
});

// --- CATEGORÍAS DINÁMICAS ---

const categoriaSelect = document.getElementById("categoria");
const filtroSelect = document.getElementById("filtroCategoria");
const listaCategorias = document.getElementById("listaCategorias");
const formCategoria = document.getElementById("formCategoria");
const inputNuevaCategoria = document.getElementById("nuevaCategoria");

async function fetchCategoriasApi() {
    const res = await fetch(`${SERVER_URL}/api/categorias`);
    if (!res.ok) throw new Error("No se pudo obtener las categorías");
    return res.json();
}

function capitalizar(nombre = "") {
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

async function cargarCategorias() {
    if (!categoriaSelect || !filtroSelect || !listaCategorias) return;

    categoriaSelect.innerHTML = "<option value='' disabled selected>Seleccionar categoría</option>";
    filtroSelect.innerHTML = "<option value='todas'>Todas</option>";
    listaCategorias.innerHTML = "<li>Cargando categorías...</li>";

    try {
        const categorias = await fetchCategoriasApi();
        listaCategorias.innerHTML = "";

        categorias.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat.nombre;
            option.textContent = capitalizar(cat.nombre);
            categoriaSelect.appendChild(option);

            const filtroOption = option.cloneNode(true);
            filtroSelect.appendChild(filtroOption);

            const li = document.createElement("li");
            li.innerHTML = `
                <span>${capitalizar(cat.nombre)}</span>
                <button type="button" class="btn-eliminar-cat" data-id="${cat.id}" data-nombre="${cat.nombre}">Eliminar</button>
            `;
            listaCategorias.appendChild(li);
        });

        if (!categorias.length) {
            listaCategorias.innerHTML = "<li>No hay categorías aún.</li>";
        }
    } catch (error) {
        console.error(error);
        listaCategorias.innerHTML = "<li style='color:#c94c4c'>No se pudieron cargar las categorías.</li>";
    }
}

formCategoria?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = (inputNuevaCategoria?.value || "").trim().toLowerCase();
    if (!nombre) return alert("Ingresá un nombre de categoría");

    try {
        const res = await fetch(`${SERVER_URL}/api/categorias`, {
            method: "POST",
            headers: {
                ...adminHeaders(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nombre })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            alert(data.error || "No se pudo crear la categoría");
            return;
        }

        formCategoria.reset();
        await cargarCategorias();
    } catch (error) {
        console.error(error);
        alert("❌ Error al crear la categoría");
    }
});

listaCategorias?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-eliminar-cat");
    if (!btn) return;

    const id = btn.dataset.id;
    const nombre = btn.dataset.nombre || "";

    if (!id) return;
    if (!confirm(`¿Eliminar la categoría "${capitalizar(nombre)}"?`)) return;

    try {
        const res = await fetch(`${SERVER_URL}/api/categorias/${id}`, {
            method: "DELETE",
            headers: adminHeaders()
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            alert(data.error || "No se pudo eliminar la categoría");
            return;
        }

        await cargarCategorias();
    } catch (error) {
        console.error(error);
        alert("❌ Error al eliminar la categoría");
    }
});

// --- Cargar todo al iniciar ---
document.addEventListener("DOMContentLoaded", async () => {
    const filtro = document.getElementById("filtroCategoria");

    if (filtro) {
        filtro.addEventListener("change", () => cargarProductos(filtro.value));
    }

    try {
        await cargarCategorias();
        cargarProductos();
    } catch (err) {
        console.error("Error al iniciar panel:", err);
        alert("❌ Error al iniciar el panel. Revisá la conexión.");
    }
});
