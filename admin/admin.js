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
let categoriasDisponibles = [];
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

const toastRoot = document.getElementById("toast-root");
function showToast(message, type = "info", { duration = 3500 } = {}) {
    if (!toastRoot) {
        window.alert(message);
        return;
    }
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toastRoot.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("is-visible"));

    setTimeout(() => {
        toast.classList.remove("is-visible");
        setTimeout(() => toast.remove(), 200);
    }, duration);
}

const confirmModal = document.getElementById("confirm-modal");
const confirmMessage = document.getElementById("confirm-message");
const confirmAcceptBtn = confirmModal?.querySelector('[data-confirm="accept"]') || null;
const confirmCancelBtn = confirmModal?.querySelector('[data-confirm="cancel"]') || null;

function showConfirm(message, { confirmText = "Aceptar", cancelText = "Cancelar" } = {}) {
    if (!confirmModal || !confirmMessage || !confirmAcceptBtn || !confirmCancelBtn) {
        return Promise.resolve(window.confirm(message));
    }

    confirmMessage.textContent = message;
    confirmAcceptBtn.textContent = confirmText;
    confirmCancelBtn.textContent = cancelText;
    confirmModal.classList.add("is-visible");
    confirmModal.setAttribute("aria-hidden", "false");

    return new Promise((resolve) => {
        const cleanup = (result) => {
            confirmModal.classList.remove("is-visible");
            confirmModal.setAttribute("aria-hidden", "true");
            confirmAcceptBtn.removeEventListener("click", onAccept);
            confirmCancelBtn.removeEventListener("click", onCancel);
            confirmModal.removeEventListener("click", onBackdrop);
            document.removeEventListener("keydown", onKey);
            resolve(result);
        };

        const onAccept = () => cleanup(true);
        const onCancel = () => cleanup(false);
        const onBackdrop = (e) => {
            if (e.target === confirmModal) cleanup(false);
        };
        const onKey = (e) => {
            if (e.key === "Escape") cleanup(false);
        };

        confirmAcceptBtn.addEventListener("click", onAccept);
        confirmCancelBtn.addEventListener("click", onCancel);
        confirmModal.addEventListener("click", onBackdrop);
        document.addEventListener("keydown", onKey);
    });
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Exponer para otros módulos/scripts si hiciera falta
window.db = db;

if (!firebaseConfig || String(firebaseConfig.apiKey || '').includes('TU_')) {
    console.warn('⚠️ Configuración de Firebase incompleta en admin.html');
}

const form = document.getElementById("formProducto");
const inputImagen = document.getElementById("imagen");
const batchList = document.getElementById("batchList");
const submitBtn = form?.querySelector('button[type="submit"]');
const batchFiles = new Map();
let batchCounter = 0;
const seleccionContador = document.getElementById("seleccionContador");
const btnSeleccionarTodo = document.getElementById("btnSeleccionarTodo");
const btnLimpiarSeleccion = document.getElementById("btnLimpiarSeleccion");
const btnEliminarSeleccion = document.getElementById("btnEliminarSeleccion");
const selectedProducts = new Set();
let filtroActual = "todas";
if (batchList) {
    batchList.innerHTML = `<p class="batch-placeholder">Seleccioná una o más imágenes para comenzar.</p>`;
}

function productosSeleccionadosTexto() {
    const total = selectedProducts.size;
    return total === 1 ? "1 producto seleccionado" : `${total} productos seleccionados`;
}

function updateSeleccionUI() {
    if (seleccionContador) {
        seleccionContador.textContent = productosSeleccionadosTexto();
    }
    if (btnEliminarSeleccion) {
        btnEliminarSeleccion.disabled = selectedProducts.size === 0;
    }
}

function clearSeleccion(keepCheckboxes = false) {
    selectedProducts.clear();
    if (!keepCheckboxes) {
        document.querySelectorAll(".producto-select").forEach((checkbox) => {
            checkbox.checked = false;
        });
    }
    updateSeleccionUI();
}

updateSeleccionUI();

// Tomar la instancia de Firestore expuesta por el script de módulo
if (!db) {
    console.error('Firestore (db) no está disponible. Verifica la configuración de Firebase arriba.');
}

function renderPlaceholderBatch() {
    if (!batchList) return;
    batchList.innerHTML = `<p class="batch-placeholder">Seleccioná una o más imágenes para comenzar.</p>`;
}

function crearSelectCategorias(selected = "") {
    const select = document.createElement("select");
    select.required = true;
    select.className = "batch-categoria";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.disabled = true;
    placeholderOption.textContent = "Seleccioná categoría";
    select.appendChild(placeholderOption);

    categoriasDisponibles.forEach((nombre) => {
        const opt = document.createElement("option");
        opt.value = nombre;
        opt.textContent = capitalizar(nombre);
        select.appendChild(opt);
    });

    if (selected && categoriasDisponibles.includes(selected)) {
        select.value = selected;
    } else if (categoriasDisponibles.length) {
        select.value = categoriasDisponibles[0];
    }
    return select;
}

function actualizarBatchCategorias() {
    const selects = batchList?.querySelectorAll(".batch-categoria") || [];
    selects.forEach((select) => {
        const seleccionado = select.value;
        const nuevo = crearSelectCategorias(seleccionado);
        select.innerHTML = nuevo.innerHTML;
        if (seleccionado && categoriasDisponibles.includes(seleccionado)) {
            select.value = seleccionado;
        } else if (categoriasDisponibles.length) {
            select.value = categoriasDisponibles[0];
        }
    });
}

function agregarFilaBatch(file, defaultCategoria = "") {
    if (!batchList) return;
    const id = `batch-${batchCounter++}`;
    batchFiles.set(id, file);

    const item = document.createElement("div");
    item.className = "batch-item";
    item.dataset.id = id;

    const preview = document.createElement("img");
    preview.alt = file.name;
    const reader = new FileReader();
    reader.onload = (event) => {
        preview.src = event.target.result;
    };
    reader.readAsDataURL(file);

    const fields = document.createElement("div");
    fields.className = "batch-item__fields";

    const nombreInput = document.createElement("input");
    nombreInput.type = "text";
    nombreInput.placeholder = "Nombre";
    nombreInput.className = "batch-nombre";
    nombreInput.required = true;

    const precioInput = document.createElement("input");
    precioInput.type = "text";
    precioInput.placeholder = "Precio";
    precioInput.className = "batch-precio";
    precioInput.required = true;

    const categoriaSelectClonado = crearSelectCategorias(defaultCategoria);

    fields.append(nombreInput, precioInput, categoriaSelectClonado);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "batch-remove";
    removeBtn.innerHTML = "&times;";
    removeBtn.addEventListener("click", () => eliminarFilaBatch(id));

    item.append(preview, fields, removeBtn);
    batchList.appendChild(item);
}

function eliminarFilaBatch(id) {
    batchFiles.delete(id);
    const fila = batchList?.querySelector(`.batch-item[data-id="${id}"]`);
    fila?.remove();
    if (!batchList?.querySelector(".batch-item")) {
        renderPlaceholderBatch();
    }
}

inputImagen?.addEventListener("change", (e) => {
    batchFiles.clear();
    batchList.innerHTML = "";
    const files = Array.from(e.target.files || []);
    if (!files.length) {
        renderPlaceholderBatch();
        return;
    }
    const defaultCat = categoriaSelect?.value || "";
    files.forEach((file) => agregarFilaBatch(file, defaultCat));
});

async function subirBatchProductos(items) {
    let exitos = 0;
    let fallos = 0;

    for (const item of items) {
        const id = item.dataset.id;
        const file = batchFiles.get(id);
        const nombre = item.querySelector(".batch-nombre")?.value.trim();
        const precio = item.querySelector(".batch-precio")?.value.trim();
        const categoria = item.querySelector(".batch-categoria")?.value;

        if (!file || !nombre || !precio || !categoria) {
            showToast("Completá todos los campos antes de subir.", "warning");
            return { exitos, fallos, detenido: true };
        }

        const formData = new FormData();
        formData.append("nombre", nombre);
        formData.append("precio", precio);
        formData.append("categoria", categoria);
        formData.append("imagen", file);

        try {
            const respuesta = await fetch(`${SERVER_URL}/api/productos`, {
                method: "POST",
                headers: adminHeaders(),
                body: formData
            });

            if (respuesta.status === 401) {
                showToast('🔒 No autorizado. Ingresá de nuevo.', "error");
                localStorage.removeItem(ADMIN_TOKEN_KEY);
                window.location.href = '/admin/login.html';
                return { exitos, fallos, detenido: true };
            }

            let data = {};
            try {
                const ct = respuesta.headers.get('content-type') || '';
                data = ct.includes('application/json') ? await respuesta.json() : {};
            } catch (_) { }

            if (respuesta.ok) {
                exitos += 1;
                batchFiles.delete(id);
                item.remove();
            } else {
                fallos += 1;
                showToast(`⚠️ ${data.error || `Error al subir ${nombre}`}`, "warning");
            }
        } catch (error) {
            console.error("Error:", error);
            fallos += 1;
            showToast("❌ No se pudo conectar con el servidor", "error");
        }
    }

    if (!batchList?.querySelector(".batch-item")) {
        renderPlaceholderBatch();
    }

    return { exitos, fallos, detenido: false };
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!batchList) return;

    const items = Array.from(batchList.querySelectorAll(".batch-item"));
    if (!items.length) {
        showToast("Seleccioná al menos una imagen", "warning");
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Subiendo...";
    }

    const resultado = await subirBatchProductos(items);

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Cargar productos";
    }

    if (resultado.detenido) return;

    if (resultado.exitos && !resultado.fallos) {
        showToast(`✅ ${resultado.exitos} producto(s) subidos`, "success");
        form.reset();
        if (inputImagen) inputImagen.value = "";
    } else if (resultado.exitos && resultado.fallos) {
        showToast(`⚠️ ${resultado.exitos} cargados, ${resultado.fallos} con error`, "warning");
    } else {
        showToast("❌ No se pudieron subir los productos", "error");
    }

    const filtroSelectActual = document.getElementById("filtroCategoria");
    if (filtroSelectActual) {
        filtroActual = filtroSelectActual.value || "todas";
    }
    cargarProductos(filtroActual);
});

function pluralizarProductos(total) {
    return total === 1 ? "1 producto" : `${total} productos`;
}

function cargarProductos(filtro = filtroActual) {
    filtroActual = filtro;
    selectedProducts.clear();
    updateSeleccionUI();
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
                const totalCategoria = productosPorCategoria[categoria].length;
                categoriaDiv.innerHTML = `
                    <div class="categoria-header">
                        <h2>${categoria.charAt(0).toUpperCase() + categoria.slice(1)}</h2>
                        <p class="categoria-count">${pluralizarProductos(totalCategoria)}</p>
                    </div>
                `;

                productosPorCategoria[categoria].forEach((producto) => {
                    const { id, nombre, precio, imagen } = producto;
                    const div = document.createElement("div");
                    div.className = "producto-item";
                    const categoriaLabel = producto.categoria || categoria;
                    const checkedAttr = selectedProducts.has(id) ? "checked" : "";
                    div.innerHTML = `
                        <input type="checkbox" class="producto-select" value="${id}" ${checkedAttr}>
                        <img src="${imagen}" alt="${nombre}">
                        <div class="producto-info">
                            <strong>${nombre}</strong>
                            <span>${precio}</span>
                            <span class="producto-meta">${capitalizar(categoriaLabel || "")}</span>
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
        const confirmado = await showConfirm("¿Seguro que querés eliminar este producto?", {
            confirmText: "Eliminar",
            cancelText: "Cancelar"
        });
        if (!confirmado) return;

        const resultado = await eliminarProductoApi(id);
        if (resultado?.status === "unauth") return;

        if (resultado.ok) {
            showToast(resultado.mensaje, "success");
            selectedProducts.delete(id);
            updateSeleccionUI();
            cargarProductos(filtroActual);
        } else {
            showToast(resultado.mensaje || "⚠️ No se pudo eliminar el producto", "warning");
        }
    }
});

document.addEventListener("change", (e) => {
    if (e.target.classList.contains("producto-select")) {
        const id = e.target.value;
        if (!id) return;
        if (e.target.checked) {
            selectedProducts.add(id);
        } else {
            selectedProducts.delete(id);
        }
        updateSeleccionUI();
    }
});

btnSeleccionarTodo?.addEventListener("click", () => {
    const checkboxes = document.querySelectorAll(".producto-select");
    if (!checkboxes.length) return;
    const todosSeleccionados = Array.from(checkboxes).every((cb) => cb.checked);
    checkboxes.forEach((cb) => {
        cb.checked = !todosSeleccionados;
        const id = cb.value;
        if (!id) return;
        if (cb.checked) {
            selectedProducts.add(id);
        } else {
            selectedProducts.delete(id);
        }
    });
    updateSeleccionUI();
});

btnLimpiarSeleccion?.addEventListener("click", () => {
    clearSeleccion();
});

btnEliminarSeleccion?.addEventListener("click", async () => {
    const ids = Array.from(selectedProducts);
    if (!ids.length) return;

    const confirmado = await showConfirm(
        `¿Eliminar ${ids.length} producto(s) seleccionados?`,
        { confirmText: "Eliminar", cancelText: "Cancelar" }
    );
    if (!confirmado) return;

    let exitos = 0;
    let fallos = 0;

    for (const id of ids) {
        const resultado = await eliminarProductoApi(id);
        if (resultado?.status === "unauth") return;
        if (resultado.ok) {
            exitos += 1;
            selectedProducts.delete(id);
        } else {
            fallos += 1;
        }
    }

    updateSeleccionUI();
    cargarProductos(filtroActual);

    if (exitos && !fallos) {
        showToast(`✅ ${exitos} producto(s) eliminados`, "success");
    } else if (exitos && fallos) {
        showToast(`⚠️ ${exitos} eliminados, ${fallos} con error`, "warning");
    } else {
        showToast("❌ No se pudieron eliminar los productos", "error");
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
        categoriasDisponibles = categorias.map(cat => cat.nombre);
        actualizarBatchCategorias();

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
    if (!nombre) {
        showToast("Ingresá un nombre de categoría", "warning");
        return;
    }

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
            showToast(data.error || "No se pudo crear la categoría", "error");
            return;
        }

        formCategoria.reset();
        showToast("Categoría creada", "success");
        await cargarCategorias();
    } catch (error) {
        console.error(error);
        showToast("❌ Error al crear la categoría", "error");
    }
});

async function eliminarCategoriaRequest(id, { cascade = false } = {}) {
    const param = cascade ? "?cascade=true" : "";
    const res = await fetch(`${SERVER_URL}/api/categorias/${id}${param}`, {
        method: "DELETE",
        headers: adminHeaders()
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
}

listaCategorias?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-eliminar-cat");
    if (!btn) return;

    const id = btn.dataset.id;
    const nombre = btn.dataset.nombre || "";

    if (!id) return;
    const confirmed = await showConfirm(`¿Eliminar la categoría "${capitalizar(nombre)}"?`, {
        confirmText: "Eliminar",
        cancelText: "Cancelar"
    });
    if (!confirmed) return;

    try {
        const { res, data } = await eliminarCategoriaRequest(id);

        if (res.ok) {
            showToast(data.mensaje || "Categoría eliminada", "success");
            await cargarCategorias();
            return;
        }

        if (res.status === 409 && data.productos) {
            const confirmarCascade = await showConfirm(
                `La categoría "${capitalizar(nombre)}" tiene ${data.productos} producto(s). ` +
                `Si continuás, se eliminarán esos productos y sus imágenes. ¿Deseás continuar?`,
                { confirmText: "Eliminar todo", cancelText: "Cancelar" }
            );
            if (!confirmarCascade) return;

            const cascada = await eliminarCategoriaRequest(id, { cascade: true });
            if (cascada.res.ok) {
                showToast(cascada.data.mensaje || "Categoría y productos eliminados", "success");
                await cargarCategorias();
                return;
            }

            showToast(cascada.data.error || "No se pudo eliminar la categoría", "error");
            return;
        }

        if (res.status === 401) {
            showToast('🔒 No autorizado. Ingresá de nuevo.', "error");
            localStorage.removeItem(ADMIN_TOKEN_KEY);
            window.location.href = '/admin/login.html';
            return;
        }

        showToast(data.error || "No se pudo eliminar la categoría", "error");
    } catch (error) {
        console.error(error);
        showToast("❌ Error al eliminar la categoría", "error");
    }
});

async function eliminarProductoApi(id) {
    try {
        const res = await fetch(`${SERVER_URL}/api/productos/${id}`, {
            method: "DELETE",
            headers: adminHeaders()
        });

        if (res.status === 401) {
            showToast('🔒 No autorizado. Ingresá de nuevo.', "error");
            localStorage.removeItem(ADMIN_TOKEN_KEY);
            window.location.href = '/admin/login.html';
            return { status: "unauth" };
        }

        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
            return { ok: false, mensaje: payload.error || payload.mensaje || `HTTP ${res.status}` };
        }

        return { ok: true, mensaje: payload.mensaje || "Producto eliminado correctamente" };
    } catch (error) {
        console.error("Error eliminando producto:", error);
        return { ok: false, mensaje: "❌ No se pudo conectar con el servidor" };
    }
}

// --- Cargar todo al iniciar ---
document.addEventListener("DOMContentLoaded", async () => {
    const filtro = document.getElementById("filtroCategoria");

    if (filtro) {
        filtro.addEventListener("change", () => {
            filtroActual = filtro.value;
            cargarProductos(filtroActual);
        });
    }

    try {
        await cargarCategorias();
        cargarProductos();
    } catch (err) {
        console.error("Error al iniciar panel:", err);
        showToast("❌ Error al iniciar el panel. Revisá la conexión.", "error");
    }
});
