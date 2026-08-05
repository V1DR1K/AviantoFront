# Contrato API — AviantoSoftware

Base URL: `/api`. El frontend usa DTOs; no expone entidades de persistencia.

## Convenciones

- Paginación: `page`, `size` (10, 20, 50, 100), `sortBy`, `direction` (`ASC`/`DESC`).
- Respuesta paginada: `content`, `page`, `size`, `totalElements`, `totalPages`, `sortBy`, `direction`.
- Errores: `400` validación, `404` inexistente, `409` regla de negocio, `422` transición de estado inválida, `500` inesperado.
- Borrado lógico: `DELETE` conserva historial y auditoría; `?includeDeleted=true` permite consulta administrativa.

## Recursos

| Recurso | Endpoints |
| --- | --- |
| Clientes | `GET/POST /clientes`, `GET/PUT/DELETE /clientes/{id}`, `GET /clientes/autocomplete?q=` |
| Motovehículos | `GET/POST /motovehiculos`, `GET/PUT/DELETE /motovehiculos/{id}`, `GET /motovehiculos/autocomplete?q=` |
| Catálogo | `GET/POST /catalogo-items`, `GET/PUT/DELETE /catalogo-items/{id}`, `GET /catalogo-items/{id}/price-history`, `GET /catalogo-items/duplicates?descripcion=` |
| Pedidos | `GET/POST /pedidos`, `GET/PUT/DELETE /pedidos/{id}`, `PATCH /pedidos/{id}/estado`, `POST /pedidos/{id}/duplicate` |
| Auditoría | `GET /auditoria` |
| Reportes | `GET /reportes/resumen`, `GET /reportes/evolucion`, `GET /reportes/top-items` |

`PedidoRequest` incluye cliente, motovehículo, tipo de documento, vencimiento, observaciones, descuentos, IVA e `items[]`. Cada línea porta un snapshot de descripción, tipo, cantidad, precio y descuento: el cambio futuro de catálogo no altera el documento histórico.

## Exportaciones y PDF

- `GET /{recurso}/export.xlsx` recibe los mismos filtros y ordenamientos; exporta todos los resultados filtrados, columnas solicitadas y una fecha/hora de generación.
- `GET /pedidos/{id}/pdf` genera el documento profesional en el servidor. Durante el MVP el cliente usa `jspdf` con datos mock.

## Fotos MVP

`POST /pedidos/{id}/fotos` acepta `{ filename, contentType, base64 }`. En producción se reemplaza por URL prefirmada/objeto de almacenamiento, manteniendo el DTO de metadatos.

## Cache

El cliente indexa consultas por recurso, página, tamaño, orden y filtros; invalida tras alta, edición, borrado lógico, cambio de estado o precio. El backend debe usar Spring Cache con Caffeine para catálogo/autocomplete/consultas frecuentes y evaluar Redis al escalar. Verificación: primera consulta miss, segunda hit, mutación evacúa, tercera devuelve datos nuevos.
