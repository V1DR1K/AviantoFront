# AviantoSoftware

Frontend responsive para gestión de pedidos, reparaciones y presupuestos de un taller de motos. El MVP funciona con datos mock y queda preparado para conectarse a AviantoBack (Spring Boot + PostgreSQL).

## Inicio

1. Copiar `.env.example` como `.env.local` y definir la URL de API futura.
2. `npm install`
3. `npm run dev`
4. `npm run build` para producción.

## Funcionalidad del MVP

- Dashboard operativo, cola de pedidos, detalle, creación de pedidos, gestión de clientes, motos, catálogo, reportes y auditoría.
- Filtros, búsqueda, paginación visual, estados, modales de confirmación y exportación `.xlsx`/PDF del lado del cliente.
- Diseño accesible con sidebar desktop, navegación inferior móvil y botones etiquetados para el operario.

## Estructura

- `app/`: punto de entrada y estilos globales.
- `components/`: shell, UI reutilizable, formulario y vistas.
- `lib/`: DTOs, mocks, formateadores y exportación.
- `docs/`: contrato de API y plano del backend.

## Integración y despliegue

Cambiar `NEXT_PUBLIC_USE_MOCKS=false` e implementar los servicios HTTP contra el contrato de `docs/api-contract.md`. La aplicación genera salida compatible con el starter actual; para el VPS de Contabo se puede servir tras `npm run build` con el runtime Node/Worker definido por el proyecto. No hay código de Spring Boot en este repositorio.

## Marca

Los tokens en `app/globals.css` (`--navy`, `--blue`, `--green`, tipografía, radios y elevación) son el único punto de adaptación inicial para incorporar el futuro manual de marca.
