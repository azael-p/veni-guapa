const productos = {
    remeras: [
        { img: 'img/remera.jpeg', nombre: 'Remera estampada', precio: '$850' }
    ],
    blazers: [
        { img: 'img/blazer.jpeg', nombre: 'Blazer negro', precio: '$900' }
    ],
    pantalones: [
        { img: 'img/pantalon.jpeg', nombre: 'Pantalón sastrero', precio: '$1200' }
    ],
    vestidos: [
        { img: 'img/vestido.jpeg', nombre: 'Vestido largo', precio: '$1400' }
    ],
    accesorios: [
        { img: 'img/accesorio.jpeg', nombre: 'Collar dorado', precio: '$500' }
    ]
};

function mostrarCategoria(categoria) {
    const contenedor = document.getElementById('galeria-contenido');
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
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", function () {
    mostrarCategoria('remeras');
});