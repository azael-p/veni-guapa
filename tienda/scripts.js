// --- Conexión con Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs, limit, startAfter, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { siteContent } from "./content.js";

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

const CONTACT_WHATSAPP = siteContent?.contact?.whatsapp?.international || "59898238313";
const CONTACT_WHATSAPP_DISPLAY = siteContent?.contact?.whatsapp?.display || "098 238 313";
const HERO_WHATSAPP_MESSAGE =
  siteContent?.contact?.whatsapp?.heroMessage || "Hola Veni Guapa! Quiero pedir info sobre las prendas.";
const CONTACT_WHATSAPP_MESSAGE =
  siteContent?.contact?.whatsapp?.contactMessage || "Hola Veni Guapa! Vi una prenda en la galería y quiero encargarla.";
const CONTACT_INSTAGRAM_URL = siteContent?.contact?.instagram?.url || "https://www.instagram.com/tiendaveniguapa20";
const CONTACT_INSTAGRAM_HANDLE = siteContent?.contact?.instagram?.handle || "@tiendaveniguapa20";
const HERO_INSTAGRAM_CTA = siteContent?.contact?.instagram?.heroCta || "Hablar por Instagram";

const WA_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

const IG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`;

// --- Animación de entrada para tarjetas de producto ---
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            cardObserver.unobserve(entry.target);
        }
    });
}, { rootMargin: "0px 0px -40px 0px", threshold: 0.1 });

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});

let categorias = [];

function buildProductMessage(nombre, categoria, precio = "") {
    const tienda = siteContent?.storeName || "la tienda";
    const lineas = [
        `Hola ${tienda}! Vi este producto en la galería:`,
        ``,
        `*${nombre || "Producto"}*`,
        precio ? `Precio: ${precio}` : "",
        categoria ? `Categoría: ${capitalizar(categoria)}` : "",
        ``,
        `¿Está disponible?`
    ].filter((l) => l !== undefined);
    return lineas.join("\n");
}

function buildWhatsAppLink(nombre, categoria, precio) {
    const mensaje = buildProductMessage(nombre, categoria, precio);
    return `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}

function buildGenericWhatsappLink(message) {
    return `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function capitalizar(texto = "") {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function escapeHtml(str = "") {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function categoriaId(nombre) {
    return nombre.replace(/\s+/g, "-").toLowerCase();
}

function formatPrice(precio) {
    if (precio === undefined || precio === null || precio === "" || precio === 0) return "";
    const numero = Number(String(precio).replace(/[^\d.,-]/g, "").replace(",", "."));
    if (Number.isNaN(numero) || numero === 0) return "";
    return currencyFormatter.format(numero);
}

function applyStaticContent() {
    const navBrand = document.getElementById("navStoreName");
    if (navBrand && siteContent?.storeName) {
        navBrand.textContent = siteContent.storeName;
    }
    const title = document.getElementById("storeTitle");
    if (title && siteContent?.storeName) {
        title.textContent = siteContent.storeName;
    }
    const slogan = document.getElementById("storeSlogan");
    if (slogan && siteContent?.slogan) {
        slogan.textContent = siteContent.slogan;
    }
    const intro = document.getElementById("introDescription");
    if (intro && siteContent?.introDescription) {
        intro.textContent = siteContent.introDescription;
    }
    const about = document.getElementById("aboutText");
    if (about && siteContent?.aboutText) {
        about.textContent = siteContent.aboutText;
    }

    const heroWhatsapp = document.getElementById("heroWhatsappBtn");
    if (heroWhatsapp) {
        heroWhatsapp.href = buildGenericWhatsappLink(HERO_WHATSAPP_MESSAGE);
        heroWhatsapp.innerHTML = `${WA_ICON} Escribir por WhatsApp`;
    }
    const heroInstagram = document.getElementById("heroInstagramBtn");
    if (heroInstagram) {
        heroInstagram.href = CONTACT_INSTAGRAM_URL;
        heroInstagram.innerHTML = `${IG_ICON} ${escapeHtml(HERO_INSTAGRAM_CTA)}`;
    }

    const contactWhatsapp = document.getElementById("contactWhatsapp");
    if (contactWhatsapp) {
        contactWhatsapp.href = buildGenericWhatsappLink(CONTACT_WHATSAPP_MESSAGE);
        contactWhatsapp.innerHTML = `${WA_ICON} Escribir al ${escapeHtml(CONTACT_WHATSAPP_DISPLAY)}`;
    }
    const contactInstagram = document.getElementById("contactInstagram");
    if (contactInstagram) {
        contactInstagram.href = CONTACT_INSTAGRAM_URL;
        contactInstagram.innerHTML = `${IG_ICON} Mensaje directo ${escapeHtml(CONTACT_INSTAGRAM_HANDLE)}`;
    }
    const footerNote = document.getElementById("footerNote");
    if (footerNote) {
        const year = new Date().getFullYear();
        const fallback = `© ${year} ${siteContent?.storeName || "Vení Guapa"} - Todos los derechos reservados.`;
        footerNote.textContent = siteContent?.footerNote || fallback;
    }
    const footerStoreName = document.getElementById("footerStoreName");
    if (footerStoreName && siteContent?.storeName) {
        footerStoreName.textContent = siteContent.storeName;
    }
    const footerWhatsapp = document.getElementById("footerWhatsapp");
    if (footerWhatsapp) {
        footerWhatsapp.href = buildGenericWhatsappLink(CONTACT_WHATSAPP_MESSAGE);
    }
    const footerInstagram = document.getElementById("footerInstagram");
    if (footerInstagram) {
        footerInstagram.href = CONTACT_INSTAGRAM_URL;
        footerInstagram.textContent = CONTACT_INSTAGRAM_HANDLE;
    }
    const footerEmail = document.getElementById("footerEmail");
    const email = siteContent?.contact?.email || "";
    if (footerEmail && email) {
        footerEmail.href = `mailto:${email}`;
        footerEmail.textContent = email;
    }
}

function renderCategoriasDom(listaCategorias) {
    const seccion = document.getElementById("categorias");
    if (!seccion) return;
    seccion.querySelectorAll(".categoria, .categorias-chips").forEach((el) => el.remove());

    // Fila de chips
    const chipsRow = document.createElement("div");
    chipsRow.className = "categorias-chips";

    const fragment = document.createDocumentFragment();
    listaCategorias.forEach((cat) => {
        const id = categoriaId(cat);
        const label = capitalizar(cat);

        // Chip
        const chip = document.createElement("button");
        chip.className = "boton-categoria";
        chip.dataset.categoria = id;
        chip.dataset.label = label;
        chip.textContent = label;
        chipsRow.appendChild(chip);

        // Carrusel (sin título interno)
        const categoriaDiv = document.createElement("div");
        categoriaDiv.className = "categoria";
        categoriaDiv.innerHTML = `
            <div class="carrusel" id="${id}" data-label="${label}">
                <div class="carrusel-inner">
                    <button class="flecha izquierda" data-categoria="${id}">‹</button>
                    <div class="galeria-imagenes"></div>
                    <button class="flecha derecha" data-categoria="${id}">›</button>
                </div>
            </div>
        `;
        fragment.appendChild(categoriaDiv);
    });

    seccion.appendChild(chipsRow);
    seccion.appendChild(fragment);
    resetCarruseles();
}

function resetCarruseles() {
    document.querySelectorAll(".carrusel").forEach((c) => c.classList.remove("visible"));
}

async function obtenerCategorias() {
    try {
        const snapshot = await getDocs(collection(db, "categorias"));
        const catDocs = snapshot.docs
            .map((doc) => ({ nombre: doc.data().nombre, orden: doc.data().orden ?? 9999 }))
            .filter((c) => c.nombre);
        catDocs.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
        if (catDocs.length) return catDocs.map((c) => c.nombre);
    } catch (error) {
        console.error("No se pudieron cargar categorías dinámicas", error);
    }
    return [];
}

async function inicializarCategorias() {
    categorias = await obtenerCategorias();
    renderCategoriasDom(categorias);
    cargarProductos();
}

const LIMITE_PRODUCTOS = 12;

function renderSkeletons(galeria, count = 4) {
    galeria.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const item = document.createElement("article");
        item.className = "item-galeria skeleton-item";
        item.innerHTML = `
            <div class="skeleton-img"></div>
            <div class="skeleton-info">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line btn"></div>
            </div>
        `;
        galeria.appendChild(item);
    }
}

// Renderiza un artículo y lo agrega a la galería
function renderItem(galeria, data, categoria, delaySegundos) {
    const precioVisible = formatPrice(data.precio);
    const categoriaLabel = capitalizar(categoria);
    const item = document.createElement("article");
    item.className = "item-galeria";
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Ver ${escapeHtml(data.nombre)} en grande`);
    item.innerHTML = `
        <div class="item-img-wrap">
            <img loading="lazy" class="lazy-img" src="${escapeHtml(data.imagen)}" alt="${escapeHtml(data.nombre)}">
        </div>
        <div class="item-info">
            <p class="item-nombre">${escapeHtml(data.nombre)}</p>
            ${precioVisible ? `<p class="item-precio">${escapeHtml(precioVisible)}</p>` : ""}
            <div class="item-cta">
                <a class="btn-consultar" href="${escapeHtml(buildWhatsAppLink(data.nombre, categoriaLabel, precioVisible))}" target="_blank" rel="noopener noreferrer">Consultar</a>
            </div>
        </div>
    `;
    galeria.appendChild(item);
    cardObserver.observe(item);

    const img = item.querySelector("img");
    img.style.animationDelay = `${delaySegundos}s`;
    img.dataset.nombre = data.nombre;
    img.dataset.precio = precioVisible;
    img.dataset.categoria = categoriaLabel;

    if (img.complete) {
        img.classList.add("loaded");
    } else {
        img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
    }
}

// Carga productos adicionales al hacer clic en "Ver más"
async function cargarMasProductos(galeria, inner, categoria, lastDoc) {
    try {
        const q = query(
            collection(db, "productos"),
            where("categoria", "==", categoria),
            orderBy("__name__"),
            startAfter(lastDoc),
            limit(LIMITE_PRODUCTOS)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const offset = galeria.querySelectorAll(".item-galeria").length;
        snapshot.forEach((docSnap, i) => {
            renderItem(galeria, docSnap.data(), categoria, (offset + i) * 0.05);
        });

        if (snapshot.size >= LIMITE_PRODUCTOS) {
            const newLast = snapshot.docs[snapshot.docs.length - 1];
            agregarBotonVerMas(inner, galeria, categoria, newLast);
        }
    } catch (error) {
        console.error(`Error cargando más productos de "${categoria}":`, error);
    }
}

function agregarBotonVerMas(inner, galeria, categoria, lastDoc) {
    inner.querySelector(".btn-ver-mas")?.remove();
    const btn = document.createElement("button");
    btn.className = "btn-ver-mas";
    btn.textContent = "Ver más";
    btn.addEventListener("click", async () => {
        btn.remove();
        await cargarMasProductos(galeria, inner, categoria, lastDoc);
    });
    inner.appendChild(btn);
}

// --- Cargar productos desde Firebase ---
async function cargarProductos() {
    if (!categorias.length) return;
    for (const categoria of categorias) {
        const contenedorPrev = document.getElementById(categoriaId(categoria));
        if (contenedorPrev) {
            const galeriaPrev = contenedorPrev.querySelector(".galeria-imagenes");
            if (galeriaPrev) renderSkeletons(galeriaPrev, 4);
        }

        const q = query(
            collection(db, "productos"),
            where("categoria", "==", categoria),
            orderBy("__name__"),
            limit(LIMITE_PRODUCTOS)
        );

        onSnapshot(q, (querySnapshot) => {
            const contenedor = document.getElementById(categoriaId(categoria));
            if (!contenedor) return;
            const inner = contenedor.querySelector(".carrusel-inner");
            const galeria = contenedor.querySelector(".galeria-imagenes");
            if (!galeria || !inner) return;

            // Limpiar galería (skeletons y botón "Ver más" anterior)
            galeria.innerHTML = "";
            inner.querySelector(".btn-ver-mas")?.remove();

            if (querySnapshot.empty) {
                contenedor.classList.add("sin-items");
                galeria.innerHTML = `<p class="empty-state">Sin productos por ahora.</p>`;
                return;
            }
            contenedor.classList.remove("sin-items");

            querySnapshot.forEach((docSnap, i) => {
                renderItem(galeria, docSnap.data(), categoria, i * 0.05);
            });

            if (querySnapshot.size >= LIMITE_PRODUCTOS) {
                const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
                agregarBotonVerMas(inner, galeria, categoria, lastDoc);
            }
        }, (error) => {
            console.error(`Error cargando categoría "${categoria}":`, error);
            const contenedor = document.getElementById(categoriaId(categoria));
            if (!contenedor) return;
            contenedor.classList.add("sin-items");
            const galeria = contenedor.querySelector(".galeria-imagenes");
            if (galeria) galeria.innerHTML = `<p class="empty-state">Error al cargar productos.</p>`;
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    applyStaticContent();
    inicializarCategorias();
});

document.addEventListener("DOMContentLoaded", () => {
    const scrollBtn = document.getElementById("scrollTopBtn");
    if (!scrollBtn) return;

    const toggleScrollBtn = () => {
        if (window.scrollY > 500) {
            scrollBtn.classList.add("visible");
        } else {
            scrollBtn.classList.remove("visible");
        }
    };

    window.addEventListener("scroll", toggleScrollBtn, { passive: true });
    window.addEventListener("resize", toggleScrollBtn);
    scrollBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    toggleScrollBtn();
});

// --- Mostrar solo una categoría a la vez con indicador ---
document.addEventListener("click", (e) => {
    const boton = e.target.closest(".boton-categoria");
    if (!boton) return;

    const categoriaSeleccionada = boton.dataset.categoria;
    const carruselSeleccionado = document.getElementById(categoriaSeleccionada);
    if (!carruselSeleccionado) return;

    document.querySelectorAll(".carrusel").forEach((carrusel) => {
        if (carrusel !== carruselSeleccionado) {
            carrusel.classList.remove("visible");
        }
    });

    document.querySelectorAll(".boton-categoria").forEach((btn) => {
        if (btn !== boton) {
            btn.classList.remove("activo");
        }
    });

    const isVisible = carruselSeleccionado.classList.toggle("visible");
    if (isVisible) {
        boton.classList.add("activo");
    } else {
        boton.classList.remove("activo");
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
<div class="modal-body">
    <img class="modal-img" alt="">
    <div class="modal-info">
        <div class="modal-text">
            <span class="modal-counter"></span>
            <span class="modal-name"></span>
            <span class="modal-price"></span>
        </div>
        <a class="modal-cta whatsapp" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>
    </div>
</div>
<button class="modal-flecha derecha" aria-label="Imagen siguiente">›</button>
<span class="cerrar">&times;</span>
`;
document.body.appendChild(modal);

const modalImg = modal.querySelector(".modal-img");
const modalCounter = modal.querySelector(".modal-counter");
const modalName = modal.querySelector(".modal-name");
const modalPrice = modal.querySelector(".modal-price");
const modalWhatsapp = modal.querySelector(".modal-cta.whatsapp");
let imagenes = [];
let indiceActual = 0;
let startX = 0;
let isSwiping = false;

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

modal.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    isSwiping = true;
}, { passive: true });

modal.addEventListener("touchmove", (e) => {
    if (!isSwiping || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - startX;
    if (Math.abs(deltaX) > 50) {
        isSwiping = false;
        if (deltaX > 0) {
            cambiarImagen(-1);
        } else {
            cambiarImagen(1);
        }
    }
}, { passive: true });

modal.addEventListener("touchend", () => {
    isSwiping = false;
});

function actualizarMeta(indice) {
    if (!imagenes[indice]) return;
    const img = imagenes[indice];
    const nombre = img?.dataset?.nombre || img?.getAttribute("alt") || "Producto";
    const categoria = img?.dataset?.categoria || "";
    const precio = img?.dataset?.precio || "";

    if (modalCounter) {
        modalCounter.textContent = `${indice + 1}/${imagenes.length}`;
    }
    if (modalName) {
        modalName.textContent = nombre;
    }
    if (modalPrice) {
        modalPrice.textContent = precio || "";
    }
    if (modalWhatsapp) {
        modalWhatsapp.href = buildWhatsAppLink(nombre, categoria, precio);
    }
}

function mostrarImagen(indice, direccionAnim = 0) {
    if (!imagenes[indice]) return;
    modalImg.classList.remove("anim-left", "anim-right");
    if (direccionAnim !== 0) {
        void modalImg.offsetWidth; // reinicia animación
        modalImg.classList.add(direccionAnim > 0 ? "anim-right" : "anim-left");
    }
    modalImg.src = imagenes[indice].src;
    actualizarMeta(indice);
}

function cambiarImagen(direccion) {
    indiceActual = (indiceActual + direccion + imagenes.length) % imagenes.length;
    mostrarImagen(indiceActual, direccion);
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
