const productos = {
    remeras: [
        { img: 'img/remera.jpeg', nombre: 'Remera estampada', precio: '$850' }
    ],
    blazers: [
        { img: 'img/blazer.jpeg', nombre: 'Blazer negro', precio: '$900' }
    ],
    pantalones: [
        { img: 'img/remera.jpeg', nombre: 'Pantalón sastrero', precio: '$1200' }
    ],
    vestidos: [
        { img: 'img/blazer.jpeg', nombre: 'Vestido largo', precio: '$1400' }
    ],
    accesorios: [
        { img: 'img/remera.jpeg', nombre: 'Collar dorado', precio: '$500' }
    ]
};

function toggleCategoria(categoria) {
    const contenedor = document.getElementById(categoria);
    const visible = contenedor.style.display === 'block';

    // Oculta todas las galerías
    document.querySelectorAll('.galeria-imagenes').forEach(div => {
        div.style.display = 'none';
    });

    // Si no estaba visible, la mostramos con contenido
    if (!visible) {
        contenedor.innerHTML = '';
        productos[categoria].forEach(prod => {
            const item = document.createElement('div');
            item.className = 'item-galeria';
            item.innerHTML = `
                <img src="${prod.img}" alt="${prod.nombre}">
                <p>${prod.nombre} ${prod.precio}</p>
            `;
            contenedor.appendChild(item);
        });
        contenedor.style.display = 'block';
    }
}

let headerCompactoActivo = false;

window.addEventListener("scroll", function () {
    const header = document.querySelector("header");
    const scrolled = window.scrollY > 50;

    if (scrolled && !headerCompactoActivo) {
        header.classList.add("compacto");
        headerCompactoActivo = true;
    } else if (!scrolled && headerCompactoActivo) {
        header.classList.remove("compacto");
        headerCompactoActivo = false;
    }
});