// --- Conexión con Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
    apiKey: "AIzaSyCiZLb3nLawS3sQbvI0iWOi-fSCvnG4nr0",
    authDomain: "veni-guapa.firebaseapp.com",
    projectId: "veni-guapa",
    storageBucket: "veni-guapa.appspot.com",
    messagingSenderId: "961134304703",
    appId: "1:961134304703:web:a3f19b7d9b9d5bac0a950a",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Cargar productos desde Firebase ---
const categorias = ["remeras", "blazers", "pantalones", "vestidos", "accesorios"];

async function cargarProductos() {
    for (const categoria of categorias) {
        const q = query(collection(db, "productos"), where("categoria", "==", categoria));

    // Listener en tiempo real por categoría
    onSnapshot(q, (querySnapshot) => {
        const contenedor = document.getElementById(categoria);
        if (!contenedor) return;

        const galeria = contenedor.querySelector(".galeria-imagenes");
        if (!galeria) return;
        galeria.innerHTML = "";

        if (querySnapshot.empty) {
            galeria.innerHTML = `<p class="empty-state">Sin productos por ahora.</p>`;
            return;
        }

        let delay = 0;
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const item = document.createElement("div");
            item.className = "item-galeria";
            item.innerHTML = `
            <img loading="lazy" class="lazy-img" src="${data.imagen}" alt="${data.nombre}">
            <p>${data.nombre} - ${data.precio}</p>
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

document.addEventListener("DOMContentLoaded", cargarProductos);

// --- Asegurar que las categorías inicien cerradas ---
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".carrusel").forEach((c) => c.classList.remove("visible"));
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

document.addEventListener("click", (e) => {
    if (e.target.matches(".galeria-imagenes img")) {
        imagenes = [...e.target.closest(".galeria-imagenes").querySelectorAll("img")];
        indiceActual = imagenes.indexOf(e.target);
        mostrarImagen(indiceActual);
        modal.style.display = "flex";
    } else if (e.target.classList.contains("cerrar")) {
        modal.style.display = "none";
    } else if (e.target.classList.contains("modal-flecha")) {
    if (e.target.classList.contains("izquierda")) {
        cambiarImagen(-1);
    } else if (e.target.classList.contains("derecha")) {
        cambiarImagen(1);
    }
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
    if (modal.style.display === "flex") {
        if (e.key === "ArrowLeft") cambiarImagen(-1);
        if (e.key === "ArrowRight") cambiarImagen(1);
        if (e.key === "Escape") modal.style.display = "none";
    }
});

// --- Header dinámico (compacto) con IntersectionObserver (anti-jitter Chrome) ---
document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector("header");
    if (!header) return;

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