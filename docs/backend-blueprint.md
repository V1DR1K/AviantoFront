# Backend futuro — AviantoBack

El backend vive exclusivamente en `AviantoBack` y se implementará con Java, Spring Boot, Jakarta Persistence y PostgreSQL.

## Capas

`Controller → Service → Repository → Entity`; los `Mapper` traducen entre entidades y DTOs. Controllers nunca exponen entidades. Spring Data resuelve `Pageable`, especificaciones de filtros y ordenamientos permitidos por recurso.

## Dominios

`Cliente`, `Motovehiculo`, `MarcaMoto`, `ItemCatalogo`, `CategoriaCatalogo`, `Pedido`, `PedidoItem`, `PedidoFoto`, `Usuario`, `Auditoria` y `PriceHistory`. `PedidoItem` conserva precio, descripción y tipo como snapshot. Las eliminaciones se modelan con `deletedAt/deletedBy`, no borrado físico.

## Reglas

- Cliente posee múltiples motos; una moto pertenece a un cliente.
- Motovehiculo referencia a `MarcaMoto`; ItemCatalogo referencia a `CategoriaCatalogo`. No se persiste código interno de catálogo.
- Usuario posee los roles `ADMINISTRACION` u `OPERARIO`; contraseñas hasheadas y secretos permanecen fuera de todos los DTOs.
- Ítems inactivos no se sugieren para pedidos nuevos pero siguen visibles en históricos.
- Presupuesto desactiva IVA por defecto; Factura lo activa.
- Transiciones de estado y cambio a Pagado se validan en `PedidoService` y emiten auditoría.
- PDF y Excel se generan detrás de servicios dedicados, respetando filtros completos.

## Persistencia y operaciones

Agregar índices únicos parciales por `motovehiculo.patente`, `cliente.documento` cuando exista, `usuario.email`, y por nombres normalizados activos de marca/categoría; además de índices por `pedido.numero`, estado, fechas y descripciones normalizadas. Usar Flyway para migraciones. Un interceptor o listener de aplicación registra auditoría para ABM, cambios de precio, estado, configuración e ítems. Caffeine cachea catálogo, autocompletados, marcas y categorías; Redis es el reemplazo de caché distribuida.
