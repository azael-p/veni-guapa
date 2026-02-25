// --- Conexión con Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("js-enabled");
});

// --- Carruseles: navegación con flechas ---
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("flecha")) {
        const carrusel = e.target.closest(".carrusel").querySelector(".galeria-imagenes");
        const scrollAmount = carrusel.clientWidth * 0.9;
        if (e.target.classList.contains("izquierda")) {
            carrusel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        } else {
            carrusel.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    }
});


const firebaseConfig = {
  apiKey: "AIzaSyDjMHUZNLuyANjNgZRDdEYI2vhWw0QJrck",
  authDomain: "veni-guapa-a6d74.firebaseapp.com",
  projectId: "veni-guapa-a6d74",
  storageBucket: "veni-guapa-a6d74.firebasestorage.app",
  messagingSenderId: "163522581569",
  appId: "1:163522581569:web:10d92da46d2b17614162c0",
  measurementId: "G-6PMCYPVTWQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CONTACT_WHATSAPP = "59899999999";
const CONTACT_INSTAGRAM = "https://www.instagram.com/tiendaveniguapa20";
const DEFAULT_CATEGORIES = ["remeras", "blazers", "pantalones", "vestidos", "accesorios"];

let categorias = [];

function buildWhatsAppLink(nombre, categoria) {
    const mensaje = `Hola Veni Guapa! Vi ${nombre || "una prenda"} en la categoría ${categoria}. ¿Está disponible?`;
    return `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}

function capitalizar(texto = "") {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function categoriaId(nombre) {
    return nombre.replace(/\s+/g, "-").toLowerCase();
}

function renderCategoriasDom(listaCategorias) {
    const seccion = document.getElementById("categorias");
    if (!seccion) return;
    const existentes = seccion.querySelectorAll(".categoria");
    existentes.forEach((el) => el.remove());

    const fragment = document.createDocumentFragment();
    listaCategorias.forEach((cat) => {
        const id = categoriaId(cat);
        const categoriaDiv = document.createElement("div");
        categoriaDiv.className = "categoria";
        categoriaDiv.innerHTML = `
            <button class="boton-categoria" data-categoria="${id}">${capitalizar(cat)}</button>
            <div class="carrusel" id="${id}">
                <button class="flecha izquierda" data-categoria="${id}">‹</button>
                <div class="galeria-imagenes"></div>
                <button class="flecha derecha" data-categoria="${id}">›</button>
            </div>
        `;
        fragment.appendChild(categoriaDiv);
    });

    seccion.appendChild(fragment);
    resetCarruseles();
}

function resetCarruseles() {
    document.querySelectorAll(".carrusel").forEach((c) => c.classList.remove("visible"));
}

async function obtenerCategorias() {
    try {
        const snapshot = await getDocs(collection(db, "categorias"));
        const catDocs = snapshot.docs.map((doc) => doc.data().nombre).filter(Boolean);
        if (catDocs.length) return catDocs;
    } catch (error) {
        console.error("No se pudieron cargar categorías dinámicas", error);
    }
    return DEFAULT_CATEGORIES;
}

async function inicializarCategorias() {
    categorias = await obtenerCategorias();
    renderCategoriasDom(categorias);
    cargarProductos();
}

// --- Cargar productos desde Firebase ---
async function cargarProductos() {
    if (!categorias.length) return;
    for (const categoria of categorias) {
        const q = query(collection(db, "productos"), where("categoria", "==", categoria));

    // Listener en tiempo real por categoría
    onSnapshot(q, (querySnapshot) => {
        const contenedor = document.getElementById(categoriaId(categoria));
        if (!contenedor) return;

        const galeria = contenedor.querySelector(".galeria-imagenes");
        if (!galeria) return;
        galeria.innerHTML = "";

        if (querySnapshot.empty) {
            contenedor.classList.add("sin-items");
            galeria.innerHTML = `<p class="empty-state">Sin productos por ahora.</p>`;
            return;
        }
        contenedor.classList.remove("sin-items");

        let delay = 0;
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const item = document.createElement("article");
            item.className = "item-galeria";
            item.tabIndex = 0;
            item.setAttribute("role", "button");
            item.setAttribute("aria-label", `Ver ${data.nombre} en grande`);
            item.innerHTML = `
                <img loading="lazy" class="lazy-img" src="${data.imagen}" alt="${data.nombre}">
                <div class="item-overlay">
                    <p class="item-nombre">${data.nombre}</p>
                    <p class="item-precio">${data.precio}</p>
                    <div class="item-cta">
                        <a class="cta-mini whatsapp" href="${buildWhatsAppLink(data.nombre, categoria)}" target="_blank" rel="noopener noreferrer">Consultar</a>
                        <a class="cta-mini instagram" href="${CONTACT_INSTAGRAM}" target="_blank" rel="noopener noreferrer">DM</a>
                    </div>
                </div>
            `;
            galeria.appendChild(item);

            const img = item.querySelector("img");
            img.style.animationDelay = `${delay}s`;
            delay += 0.1;

            if (img.complete) {
                img.classList.add("loaded");
            } else {
                img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
            }
        });
    });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarCategorias();
});

// --- Mostrar solo una categoría a la vez con animación elegante ---
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("boton-categoria")) {
        const categoriaSeleccionada = e.target.dataset.categoria;
        const carruselSeleccionado = document.getElementById(categoriaSeleccionada);

        // Cerrar todas las demás
        document.querySelectorAll(".carrusel").forEach((carrusel) => {
        if (carrusel !== carruselSeleccionado) carrusel.classList.remove("visible");
        });

    // Alternar la seleccionada
    carruselSeleccionado.classList.toggle("visible");
    }
});

// --- Modal de imágenes ampliadas ---
const modal = document.createElement("div");
modal.classList.add("modal");
modal.setAttribute("role", "dialog");
modal.setAttribute("aria-modal", "true");
modal.setAttribute("aria-label", "Imagen ampliada");
modal.innerHTML = `
<button class="modal-flecha izquierda" aria-label="Imagen anterior">‹</button>
<img class="modal-img">
<button class="modal-flecha derecha" aria-label="Imagen siguiente">›</button>
<span class="cerrar">&times;</span>
`;
document.body.appendChild(modal);

const modalImg = modal.querySelector(".modal-img");
let imagenes = [];
let indiceActual = 0;

function abrirModal() {
    modal.classList.add("abierta");
}

function cerrarModal() {
    modal.classList.remove("abierta");
}

document.addEventListener("click", (e) => {
    let triggerImg = null;

    if (e.target.matches(".galeria-imagenes img")) {
        triggerImg = e.target;
    } else if (!e.target.closest(".item-cta")) {
        const card = e.target.closest(".item-galeria");
        if (card) triggerImg = card.querySelector("img");
    }

    if (triggerImg) {
        const galeria = triggerImg.closest(".galeria-imagenes");
        imagenes = galeria ? [...galeria.querySelectorAll("img")] : [];
        indiceActual = imagenes.indexOf(triggerImg);
        mostrarImagen(indiceActual);
        abrirModal();
    } else if (e.target.classList.contains("cerrar")) {
        cerrarModal();
    } else if (e.target.classList.contains("modal-flecha")) {
    if (e.target.classList.contains("izquierda")) {
        cambiarImagen(-1);
    } else if (e.target.classList.contains("derecha")) {
        cambiarImagen(1);
    }
    }
});

modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        cerrarModal();
    }
});

function mostrarImagen(indice) {
    if (!imagenes[indice]) return;
    modalImg.src = imagenes[indice].src;
}

function cambiarImagen(direccion) {
    indiceActual = (indiceActual + direccion + imagenes.length) % imagenes.length;
    mostrarImagen(indiceActual);
}

document.addEventListener("keydown", (e) => {
    const card = e.target.closest(".item-galeria");
    if (!e.target.closest(".item-cta") && card && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        const img = card.querySelector("img");
        if (img) {
            const galeria = card.closest(".galeria-imagenes");
            imagenes = galeria ? [...galeria.querySelectorAll("img")] : [];
            indiceActual = imagenes.indexOf(img);
            mostrarImagen(indiceActual);
            abrirModal();
            return;
        }
    }

    if (modal.classList.contains("abierta")) {
        if (e.key === "ArrowLeft") cambiarImagen(-1);
        if (e.key === "ArrowRight") cambiarImagen(1);
        if (e.key === "Escape") cerrarModal();
    }
});

// --- Header dinámico (compacto) con IntersectionObserver (anti-jitter Chrome) ---
document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("header");
    if (!header) return;

    if (window.matchMedia("(max-width: 768px)").matches) {
        header.classList.remove("compacto");
        return;
    }

    // Creamos un "sentinela" justo después del header
    const sentinel = document.createElement("div");
    sentinel.id = "header-sentinel";
    sentinel.style.height = "1px"; // tamaño mínimo
    header.insertAdjacentElement("afterend", sentinel);

    const io = new IntersectionObserver(([entry]) => {
        // Compactar el header casi de inmediato al scrollear
        if (entry.intersectionRatio < 0.99) {
        header.classList.add("compacto");
        } else {
        header.classList.remove("compacto");
        }
    }, {
        root: null,
        rootMargin: "0px 0px -1px 0px", // se activa casi de inmediato al scrollear
        threshold: [0, 0.99, 1]
    });

    io.observe(sentinel);
});
