# Backend futuro — AviantoBack

El backend vive exclusivamente en `AviantoBack` y se implementará con Java, Spring Boot, Jakarta Persistence y PostgreSQL.

## Capas

`Controller → Service → Repository → Entity`; los `Mapper` traducen entre entidades y DTOs. Controllers nunca exponen entidades. Spring Data resuelve `Pageable`, especificaciones de filtros y ordenamientos permitidos por recurso.

## Dominios

`Cliente`, `Motovehiculo`, `ItemCatalogo`, `Pedido`, `PedidoItem`, `PedidoFoto`, `Auditoria` y `PriceHistory`. `PedidoItem` conserva precio, descripción y tipo como snapshot. Las eliminaciones se modelan con `deletedAt/deletedBy`, no borrado físico.

## Reglas

- Cliente posee múltiples motos; una moto pertenece a un cliente.
- Ítems inactivos no se sugieren para pedidos nuevos pero siguen visibles en históricos.
- Presupuesto desactiva IVA por defecto; Factura lo activa.
- Transiciones de estado y cambio a Pagado se validan en `PedidoService` y emiten auditoría.
- PDF y Excel se generan detrás de servicios dedicados, respetando filtros completos.

## Persistencia y operaciones

Agregar índices por patente, documento/teléfono, `pedido.numero`, estado, fechas y descripciones normalizadas. Usar Flyway para migraciones. Un interceptor o listener de aplicación registra auditoría para ABM, cambios de precio, estado e ítems. Caffeine cachea catálogo y autocompletados; Redis es el reemplazo de caché distribuida.
