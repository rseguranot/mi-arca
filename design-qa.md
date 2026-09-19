# Design QA — selector de Arca

## Evidencia de comparación

- Fuente visual: `C:\Users\ROBERT~1\AppData\Local\Temp\codex-clipboard-67e3cad6-64bf-43af-9b88-dbf46a76922a.png`.
- Implementación: captura de navegador de `http://127.0.0.1:5173/` con el estado sin Arcas, renderizada localmente durante la revisión.
- Tamaño de comparación: 1440 × 1080 CSS px, `deviceScaleFactor: 1`.
- Estado: usuario autenticado sin Arcas; se muestran las acciones Crear y Unirme. La captura se hizo mediante un arnés local temporal eliminado antes de la verificación final, por lo que no deja una ruta ni funcionalidad de prueba en la aplicación.
- Interacciones verificadas: `Crear` muestra el formulario Crear un Arca y `Volver` devuelve a la selección. La carga final de la pantalla de acceso no produjo errores ni advertencias en la consola del navegador.

## Comparación visual

La composición coincide en sus regiones principales: paisaje de acuarela pálido a pantalla completa, tarjeta blanca de 850 px centrada, logo vertical, nombre de marca serif verde, encabezado centrado, subtítulo gris y dos acciones circulares de gran tamaño. El fondo es una ilustración raster propia (`src/assets/arca-onboarding-landscape.png`), no formas CSS.

### Superficies de fidelidad

- **Tipografía:** encabezados con Georgia para reproducir el contraste serif editorial de la fuente; etiquetas e instrucciones conservan Manrope para legibilidad funcional.
- **Ritmo y layout:** tarjeta de 760 px de alto, radio de 28 px, espaciado vertical ampliado y acciones desplazadas a la zona inferior como la referencia.
- **Colores:** marfil cálido, verdes salvia y eucalipto, agua aqua tenue, dorado apagado y texto verde profundo.
- **Imágenes e iconos:** paisaje raster generado para el proyecto, logo existente de Mi Arca y los iconos accesibles de MUI `Add` y `LoginRounded`.
- **Contenido:** se conserva el texto solicitado: Mi Arca, Comienza tu travesía, Crear y Unirme.

## Historial

1. Se encontró una diferencia P1: decoración CSS genérica, tarjeta pequeña y jerarquía tipográfica insuficiente. Se sustituyó por una ilustración ambiental integrada y se reajustaron dimensiones y tipografía.
2. Se encontró una diferencia P2: tarjeta baja y contenido verticalmente comprimido. Se elevó la altura, se amplió el logo, el encabezado y las acciones; la captura posterior alineó el ritmo con la referencia.
3. Se corrigió una advertencia de React: `justifyContent` ya no se pasa al DOM como atributo inválido.

## Resultado

final result: passed

### Pulido posterior

- P3: si se selecciona una fuente editorial licenciada o se incorpora una fuente web equivalente, se podría igualar aún más la forma exacta de las letras de la maqueta.
