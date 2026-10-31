# AviantoSoftware

Frontend responsive para gestión de fichas, reparaciones, repuestos, pagos y ventas de un taller de motos. Consume AviantoBack (Spring Boot + PostgreSQL) mediante `/api`.

## Inicio

1. Copiar `.env.example` como `.env.local` y definir la URL de API si no se usa el proxy local. Para una API remota, configurar `AVIANTO_API_PROXY` con su origen (por ejemplo, `https://avianto.neticar.com.ar`); el servidor de desarrollo enviará las solicitudes `/api` a ese destino.
2. `npm install`
3. `npm run dev`
4. `npm run build` para producción.

## Funcionalidad del MVP

- Dashboard operativo, fichas de taller, repuestos, ventas, transferencias, clientes, motos, catálogo, reportes y auditoría.
- Filtros, búsqueda, paginación, estados, modales de confirmación y descargas server-side de XLSX/PDF.
- Diseño accesible con sidebar desktop, navegación inferior móvil y botones etiquetados para el operario.

## Estructura

- `app/`: punto de entrada y estilos globales.
- `components/`: shell, UI reutilizable, formulario y vistas.
- `lib/`: DTOs, mocks, formateadores y exportación.
- `docs/`: contrato de API y plano del backend.

## Integración y despliegue

Para una instalación local reproducible, usar el `docker-compose.full.yml` del backend con `AviantoBack` y `AviantoFront` como directorios hermanos. El proxy publica un único puerto y mantiene el frontend y sus chunks dentro de la misma imagen/release.

## Marca

`app/design-tokens.css` define la paleta oficial, tipografía, espaciado, radios y recursos gráficos. `components/avianto-layout.css` contiene el sistema compartido de páginas, tablas, estados, formularios y navegación. `DESIGN.md` documenta su aplicación a cada módulo. Arboria Medium y Bold se sirven desde `public/fonts/` (Book, Light y Thin no están incluidas todavía) y se conserva una alternativa legible del sistema.
