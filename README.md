# AviantoSoftware

Frontend responsive para gestión de fichas, reparaciones, repuestos, pagos y ventas de un taller de motos. Consume AviantoBack (Spring Boot + PostgreSQL) mediante `/api`.

## Inicio

1. Copiar `.env.example` como `.env.local` y definir la URL de API si no se usa el proxy local.
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

Los tokens en `app/globals.css` (`--navy`, `--blue`, `--green`, tipografía, radios y elevación) son el único punto de adaptación inicial para incorporar el futuro manual de marca.
