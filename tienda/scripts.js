// --- Conexión con Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

const DEFAULT_CATEGORIES = ["remeras", "blazers", "pantalones", "vestidos", "accesorios"];
const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});

let categorias = [];

function buildProductMessage(nombre, categoria, precio = "") {
    const partes = [
        `Hola Veni Guapa! Vi ${nombre || "una prenda"}`,
        precio ? `a ${precio}` : "",
        categoria ? `en la categoría ${categoria}` : ""
    ].filter(Boolean);
    return `${partes.join(" ")}. ¿Está disponible?`;
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

function categoriaId(nombre) {
    return nombre.replace(/\s+/g, "-").toLowerCase();
}

function formatPrice(precio) {
    const numero = Number(String(precio).replace(/[^\d.,-]/g, "").replace(",", "."));
    if (Number.isNaN(numero)) {
        return `$${precio}`;
    }
    return currencyFormatter.format(numero);
}

function applyStaticContent() {
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
    }
    const heroInstagram = document.getElementById("heroInstagramBtn");
    if (heroInstagram) {
        heroInstagram.href = CONTACT_INSTAGRAM_URL;
        heroInstagram.textContent = HERO_INSTAGRAM_CTA;
    }

    const contactWhatsapp = document.getElementById("contactWhatsapp");
    if (contactWhatsapp) {
        contactWhatsapp.href = buildGenericWhatsappLink(CONTACT_WHATSAPP_MESSAGE);
        contactWhatsapp.textContent = `Escribir al ${CONTACT_WHATSAPP_DISPLAY}`;
    }
    const contactInstagram = document.getElementById("contactInstagram");
    if (contactInstagram) {
        contactInstagram.href = CONTACT_INSTAGRAM_URL;
        contactInstagram.textContent = `Mensaje directo ${CONTACT_INSTAGRAM_HANDLE}`;
    }
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
        const label = capitalizar(cat);
        categoriaDiv.innerHTML = `
            <button class="boton-categoria" data-categoria="${id}" data-label="${label}">${label}</button>
            <div class="carrusel" id="${id}" data-label="${label}">
                <div class="carrusel-titulo">
                    <span class="carrusel-label">${label}</span>
                </div>
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
            const precioVisible = formatPrice(data.precio);
            const categoriaLabel = capitalizar(categoria);
            const item = document.createElement("article");
            item.className = "item-galeria";
            item.tabIndex = 0;
            item.setAttribute("role", "button");
            item.setAttribute("aria-label", `Ver ${data.nombre} en grande`);
            item.innerHTML = `
                <img loading="lazy" class="lazy-img" src="${data.imagen}" alt="${data.nombre}">
                <div class="item-overlay">
                    <p class="item-nombre">${data.nombre}</p>
                    <p class="item-precio">${precioVisible}</p>
                    <div class="item-cta">
                        <a class="cta-mini whatsapp" href="${buildWhatsAppLink(data.nombre, categoriaLabel, precioVisible)}" target="_blank" rel="noopener noreferrer">Consultar</a>
                    </div>
                </div>
            `;
            galeria.appendChild(item);

            const img = item.querySelector("img");
            img.style.animationDelay = `${delay}s`;
            delay += 0.1;
            img.dataset.nombre = data.nombre;
            img.dataset.precio = precioVisible;
            img.dataset.categoria = categoriaLabel;

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

// --- Header dinámico (compacto) con IntersectionObserver (anti-jitter Chrome) ---
document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("header");
    if (!header) return;

    if (window.matchMedia("(max-width: 768px)").matches) {
        header.classList.remove("compacto");
        return;
    }

    const placeholder = document.createElement("div");
    placeholder.id = "header-placeholder";
    placeholder.style.width = "100%";
    placeholder.style.height = `${header.offsetHeight}px`;
    placeholder.style.display = "none";
    header.insertAdjacentElement("afterend", placeholder);

    const updatePlaceholderHeight = () => {
        if (!header.classList.contains("compacto")) {
            placeholder.style.height = `${header.offsetHeight}px`;
        }
    };
    window.addEventListener("resize", updatePlaceholderHeight);

    // Creamos un "sentinela" justo después del placeholder
    const sentinel = document.createElement("div");
    sentinel.id = "header-sentinel";
    sentinel.style.height = "1px"; // tamaño mínimo
    placeholder.insertAdjacentElement("afterend", sentinel);

    const io = new IntersectionObserver(([entry]) => {
        // Compactar el header casi de inmediato al scrollear
        if (entry.intersectionRatio < 0.99) {
            if (!header.classList.contains("compacto")) {
                header.classList.add("compacto");
            }
            placeholder.style.display = "block";
        } else {
            header.classList.remove("compacto");
            placeholder.style.display = "none";
            updatePlaceholderHeight();
        }
    }, {
        root: null,
        rootMargin: "0px 0px -1px 0px", // se activa casi de inmediato al scrollear
        threshold: [0, 0.99, 1]
    });

    io.observe(sentinel);
});
