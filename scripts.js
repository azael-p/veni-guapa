// Asegurarse de que el documento esté listo
$(document).ready(function () {

    // Base de datos de productos
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

    // --- Mostrar/ocultar galería ---
    $('.boton-categoria').on('click', function () {
        const categoria = $(this).data('categoria');
        const contenedor = $('#' + categoria);

        // Ocultar todas las galerías con animación
        $('.galeria-imagenes').not(contenedor).slideUp(300);

        // Si el contenedor está visible, lo cerramos
        if (contenedor.is(':visible')) {
            contenedor.slideUp(300);
        } else {
            // Cargamos los productos de la categoría seleccionada
            contenedor.empty();
            $.each(productos[categoria], function (i, prod) {
                const item = $(`
                    <div class="item-galeria">
                        <img src="${prod.img}" alt="${prod.nombre}">
                        <p>${prod.nombre} ${prod.precio}</p>
                    </div>
                `);
                contenedor.append(item);
            });
            contenedor.slideDown(300);
        }
    });

    // --- Header compacto al hacer scroll ---
    let headerCompactoActivo = false;
    $(window).on('scroll', function () {
        const scrollTop = $(this).scrollTop();
        const header = $('header');

        if (scrollTop > 50 && !headerCompactoActivo) {
            header.addClass('compacto');
            headerCompactoActivo = true;
        } else if (scrollTop <= 50 && headerCompactoActivo) {
            header.removeClass('compacto');
            headerCompactoActivo = false;
        }
    });

});