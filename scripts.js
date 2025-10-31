// Asegurarse de que el documento esté listo
$(document).ready(function () {

    const productos = {
        remeras: [
            { img: 'img/remera.jpeg', nombre: 'Remera estampada 1', precio: '$850' },
            { img: 'img/remera.jpeg', nombre: 'Remera estampada 2', precio: '$890' },
            { img: 'img/remera.jpeg', nombre: 'Remera estampada 3', precio: '$870' },
            { img: 'img/remera.jpeg', nombre: 'Remera estampada 4', precio: '$900' },
            { img: 'img/blazer.jpeg', nombre: 'Blazer negro', precio: '$900' },
            { img: 'img/blazer.jpeg', nombre: 'Blazer negro', precio: '$900' },
        ],
        blazers: [
            { img: 'img/blazer.jpeg', nombre: 'Blazer negro', precio: '$900' },
            { img: 'img/blazer.jpeg', nombre: 'Blazer beige', precio: '$920' },
        ],
        pantalones: [
            { img: 'img/remera.jpeg', nombre: 'Pantalón sastrero', precio: '$1200' },
            { img: 'img/remera.jpeg', nombre: 'Pantalón denim', precio: '$1150' },
        ],
        vestidos: [
            { img: 'img/blazer.jpeg', nombre: 'Vestido largo', precio: '$1400' },
            { img: 'img/blazer.jpeg', nombre: 'Vestido corto', precio: '$1300' },
        ],
        accesorios: [
            { img: 'img/remera.jpeg', nombre: 'Collar dorado', precio: '$500' },
            { img: 'img/remera.jpeg', nombre: 'Pulsera', precio: '$450' },
        ]
    };

    // --- Mostrar / ocultar categorías y cargar carruseles ---
    $('.boton-categoria').on('click', function () {
        const categoria = $(this).data('categoria');
        const contenedor = $('#' + categoria);
        const galeria = contenedor.find('.galeria-imagenes');

        if (contenedor.is(':visible')) {
            contenedor.slideUp(400);
            return;
        }

        // Cargar imágenes si aún no fueron agregadas
        if (galeria.is(':empty')) {
            $.each(productos[categoria], function (i, prod) {
                galeria.append(`
        <div class="item-galeria">
          <img src="${prod.img}" alt="${prod.nombre}">
          <p>${prod.nombre} ${prod.precio}</p>
        </div>
      `);
            });
        }

        // Cerrar otras categorías abiertas
        $('.carrusel').not(contenedor).slideUp(400);

        // Mostrar esta
        contenedor.slideDown(400);
    });

// --- Flechas de navegación ---
    $('.flecha').on('click', function () {
        const categoria = $(this).data('categoria');
        // Buscar la galería dentro del carrusel correspondiente
        const galeria = $('#' + categoria).find('.galeria-imagenes');
        const desplazamiento = 300; // distancia de scroll por clic

        if ($(this).hasClass('izquierda')) {
            galeria.animate({ scrollLeft: '-=' + desplazamiento }, 400);
        } else {
            galeria.animate({ scrollLeft: '+=' + desplazamiento }, 400);
        }
    });

    // --- Header compacto estable (ya funciona bien) ---
    let scrollTimer;
    let headerCompactoActivo = false;
    const margen = 20;

    $(window).on('scroll', function () {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
            const scrollTop = Math.round($(window).scrollTop());
            const header = $('header');

            if (scrollTop > 100 + margen && !headerCompactoActivo) {
                header.addClass('compacto');
                headerCompactoActivo = true;
            } else if (scrollTop < 100 - margen && headerCompactoActivo) {
                header.removeClass('compacto');
                headerCompactoActivo = false;
            }
        }, 50);
    });

});