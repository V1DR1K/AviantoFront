# Contrato API — Avianto

La API del backend Avianto está bajo `/api`. Las respuestas usan DTOs; no exponen entidades JPA. Todos los endpoints de negocio requieren sesión salvo las excepciones de autenticación y health checks descritas abajo.

## Autenticación y permisos

- `POST /api/auth/login` recibe `{ "username": "usuario-o-email", "password": "..." }` y devuelve `accessToken`, `refreshToken` y el usuario.
- `POST /api/auth/refresh` recibe `{ "refreshToken": "..." }`; rota y devuelve los tokens de sesión.
- `POST /api/auth/logout` recibe `{ "refreshToken": "..." }` y responde `204`.
- `GET /api/auth/me` devuelve el usuario de la sesión actual.
- Los roles son `ADMINISTRACION` y `OPERARIO`. La API aplica sus permisos aunque la interfaz no muestre una acción.
- Los health checks `/actuator/health`, `/actuator/health/liveness` y `/actuator/health/readiness` son públicos. `/actuator/info` y la definición OpenAPI requieren Administración. El armazón y los recursos estáticos de Swagger UI son públicos; el inicializador carga `/v3/api-docs` directamente, obtiene el JWT de la sesión `avianto.session`, lo envía solo al mismo origen y renueva la sesión próxima a vencer. El documento OpenAPI genera su servidor público con `X-Forwarded-Proto` y `X-Forwarded-Host`, por lo que “Try it out” usa HTTPS detrás de Caddy. Administración puede cargar la definición y usar “Try it out”; anónimos y Operario reciben `403` para OpenAPI. `/v3/api-docs/swagger-config` también conserva permiso solo de Administración.

## Respuestas y errores

- Los listados paginados devuelven `{ content, page, size, totalElements, totalPages, sortBy, direction }`.
- Los parámetros de búsqueda textual de listados, filtros y autocompletados ignoran mayúsculas, minúsculas y acentos. La API normaliza el texto consultado y compara con `unaccent` en PostgreSQL; los campos de fecha, estado e identificadores conservan sus filtros tipados.
- Los errores devuelven `{ timestamp, status, message }`: `400` datos inválidos, `403` falta de sesión o permiso, `404` recurso inexistente o ruta desconocida, `409` conflicto de negocio, `422` transición inválida, `503` dependencia temporalmente no disponible (por ejemplo, cotización externa) y `500` error inesperado.
- Una colección anidada valida primero su recurso padre. Si la moto no existe, `/motovehiculos/{id}/propietarios`, `/transferencias`, `/services` y `/services/historial` responden `404`; una colección vacía de una moto existente responde `200`.
- Los borrados de registros de negocio y configuración son lógicos, conservan historial y responden `204`.

## Inventario de endpoints

Todos los paths siguientes incluyen el prefijo `/api`.

### Operaciones de referencia de las pantallas

- GET /ventas devuelve las fichas comerciales (`VentaFichaResponse`) para el listado y el detalle.
- GET/POST /fichas/{id}/pagos consulta el historial y registra pagos; POST /fichas/{id}/pagos/{pagoId}/anular anula un pago conservándolo en el historial.
- GET/POST /repuestos/{id}/pagos consulta y registra pagos de repuestos; POST /repuestos/{id}/pagos/{pagoId}/anular conserva la anulación en el historial.
- POST /ventas/{id}/transferencia/cancelar cancela el proceso de transferencia; POST /ventas/{id}/checklist/sincronizar sincroniza el checklist de la ficha.
- PATCH /motovehiculos/{id}/circuito cambia el circuito de la moto según sus permisos y transiciones válidas.
- GET /tipo-cambio/dolar devuelve la cotización de venta Oficial, Blue y MEP; requiere `fichas.crear` o `fichas.editar`. Las fichas conservan la cotización consultada por cada línea USD y sus totales se expresan en ARS.
- GET y PATCH /clientes/{id}/datos-completos consultan o completan DNI, teléfono, email, dirección y observaciones con `clientes.completar_datos`, sin requerir `clientes.ver` o `clientes.editar`.
- POST /fichas/{id}/trabajos/marcar-todos marca los trabajos pendientes como realizados; requiere `fichas.marcar_trabajos` y el backend limita la acción al rol Administración.
- GET /configuracion/trabajos/sugerencias busca descripciones frecuentes en al menos tres fichas distintas que aún no están en el catálogo; requiere `trabajos.ver`.

### GET (51)

- Autenticación: `/auth/me`.
- Clientes: `/clientes`, `/clientes/autocomplete`, `/clientes/{id}`, `/clientes/{id}/datos-completos`, `/clientes/export.xlsx`.
- Motovehículos y perfiles: `/motovehiculos`, `/motovehiculos/autocomplete`, `/motovehiculos/{id}`, `/motovehiculos/{id}/venta`, `/motovehiculos/{id}/propietarios`, `/motovehiculos/{id}/transferencias`, `/motovehiculos/{id}/services`, `/motovehiculos/{id}/services/historial`, `/services/proximos`, `/motovehiculos/export.xlsx`, `/perfiles`, `/perfiles/{id}`.
- Ventas y transferencias: `/ventas`, `/ventas/{id}`, `/transferencias`, `/transferencias/export.xlsx`.
- Fichas: `/fichas`, `/fichas/{id}`, `/fichas/{id}/pagos`, `/fichas/{id}/repuestos`, `/fichas/{id}/trabajos`, `/fichas/{id}/fotos/{fotoId}`, `/fichas/{id}/pdf`, `/fichas/{id}/revision`, `/fichas/export.xlsx`, `/tipo-cambio/dolar`.
- Repuestos: `/repuestos`, `/repuestos/{id}`, `/repuestos/{id}/pagos`, `/repuestos/export.xlsx`.
- Auditoría, reportes y tableros: `/auditoria`, `/reportes/resumen`, `/reportes/evolucion`, `/dashboard`, `/dashboard/taller`, `/dashboard/fichas`, `/dashboard/ventas`.
- Configuración: `/configuracion/trabajos`, `/configuracion/trabajos/autocomplete`, `/configuracion/trabajos/sugerencias`, `/configuracion/controles`, `/configuracion/ventas/checklist`, `/configuracion/marcas-moto`, `/configuracion/categorias`, `/configuracion/usuarios`.

### POST (32)

- Autenticación: `/auth/login`, `/auth/refresh`, `/auth/logout`.
- Clientes y motos: `/clientes`, `/motovehiculos`, `/motovehiculos/{id}/ingreso`, `/motovehiculos/{id}/venta/completar`, `/perfiles`, `/motovehiculos/{id}/services`, `PUT /motovehiculos/{id}/services/{serviceId}` (edita kilometraje, fecha y observaciones de un service y recalcula el último service de la moto).
- Ventas: `/ventas/{id}/checklist/sincronizar`, `/ventas/{id}/transferencia`, `/ventas/{id}/transferencia/cancelar`, `/ventas/{id}/transferencia/asistencia`, `/ventas/{id}/completar`.
- Fichas: `/fichas`, `/fichas/{id}/entregar`, `/fichas/{id}/pagos`, `/fichas/{id}/pagos/{pagoId}/anular`, `/fichas/{id}/trabajos`, `/fichas/{id}/trabajos/marcar-todos`, `/fichas/{id}/fotos`, `/fichas/{id}/revision/preparar`, `/fichas/{id}/revision/aprobar`.
- Repuestos: `/repuestos`, `/repuestos/{id}/pagos`, `/repuestos/{id}/pagos/{pagoId}/anular`.
- Configuración: `/configuracion/trabajos`, `/configuracion/controles`, `/configuracion/ventas/checklist`, `/configuracion/marcas-moto`, `/configuracion/categorias`, `/configuracion/usuarios`.

### PUT (14)

- `/clientes/{id}`, `/motovehiculos/{id}`, `/ventas/{id}/comprador`, `/ventas/{id}/transferencia/cita`, `/fichas/{id}`, `/fichas/{id}/trabajos/{trabajoId}`, `/repuestos/{id}`, `/repuestos/{id}/items/{itemId}`.
- Configuración: `/configuracion/trabajos/{id}`, `/configuracion/controles/{id}`, `/configuracion/ventas/checklist/{id}`, `/configuracion/marcas-moto/{id}`, `/configuracion/categorias/{id}`, `/configuracion/usuarios/{id}`.
- `PUT /configuracion/trabajos/{id}` recibe `TrabajoCatalogoRequest` (`descripcion`, `precioBase`, `activo?`, `alcanceFichas?: NO_MODIFICAR|FICHAS_VIGENTES`) y devuelve `TrabajoCatalogoResponse` con los conteos adicionales `fichasActualizadas` y `trabajosActualizados`. `FICHAS_VIGENTES` abarca Pendiente, En proceso, En revisión y Terminada; las fichas Entregadas y Canceladas no se modifican.

### PATCH (9)

- `/clientes/{id}/datos-completos`, `/motovehiculos/{id}/circuito`, `/motovehiculos/{id}/config-service`, `/ventas/{id}/items/{itemId}`, `/fichas/{id}/estado`, `/fichas/{id}/trabajos/{trabajoId}/estado`, `/fichas/{id}/revision/controles/{controlId}`, `/repuestos/{id}/estado`, `/repuestos/{id}/items/{itemId}/estado`.

### DELETE (12)

- `/clientes/{id}`, `/motovehiculos/{id}`, `/fichas/{id}`, `/fichas/{id}/trabajos/{trabajoId}`, `/repuestos/{id}`, `/repuestos/{id}/items/{itemId}`.
- Configuración: `/configuracion/trabajos/{id}`, `/configuracion/controles/{id}`, `/configuracion/ventas/checklist/{id}`, `/configuracion/marcas-moto/{id}`, `/configuracion/categorias/{id}`, `/configuracion/usuarios/{id}`.

`GET /transferencias` es un registro de solo lectura creado por el flujo de venta; no tiene endpoints genéricos de alta, edición o baja. Las fichas de venta se completan desde `/ventas/{id}/completar`; `/motovehiculos/{id}/venta/completar` sigue disponible por compatibilidad.

## Semántica de PATCH

- En `/motovehiculos/{id}/config-service`, los períodos `kmServicePeriodo` y `mesesServicePeriodo` solo se actualizan cuando tienen valor. `serviceObservaciones` omitido se conserva; enviarlo como `null` o `""` lo limpia.
- En `/fichas/{id}/revision/controles/{controlId}`, se actualizan únicamente las propiedades enviadas. `estado`, `observacion` y `correccionNecesaria` omitidos se conservan; `null` o `""` limpian los textos que se enviaron.
- En `/clientes/{id}/datos-completos`, los campos omitidos o `null` se conservan y las cadenas vacías limpian el campo; DNI duplicado devuelve `409`.
- Las propiedades de texto admiten `null` explícito o cadena vacía para borrar el valor; omitir la propiedad significa no modificarla.

## DTOs y archivos

- `MotorcycleRequest`: `clienteId?`, `marcaId`, `modelo`, `patente`, `anio?`, `kilometraje?`, `observaciones?`. No contiene campos `color` ni `cilindrada`.
- `ProfileRequest`: `marcaId`, `modelo`, `patente`, `anio?`, `kilometraje?`, `observaciones?`, `clienteId?`, `clienteNombre?`, `clienteTelefono?`.
- `TrabajoCatalogoRequest.alcanceFichas` permite dejar las fichas vigentes sin cambios (`NO_MODIFICAR`, opción predeterminada) o aplicar el precio a fichas Pendientes, En proceso, En revisión y Terminadas (`FICHAS_VIGENTES`). El backend actualiza trabajos con la misma descripción (comparación exacta sin distinguir mayúsculas), conserva descuentos y recalcula subtotales, total y estado de pago. Si el nuevo total queda por debajo de lo cobrado, responde `409` y revierte toda la operación.
- `FichaTrabajoRequest` admite `monedaOrigen` (`ARS`/`USD`), `precioOrigen`, `descuentoOrigen`, `cotizacionUsd`, `referenciaCotizacion` (`OFICIAL`/`BLUE`/`MEP`) y `fechaCotizacion`. ARS es la moneda predeterminada y sus valores originales se derivan de los campos existentes; para USD el backend calcula `precioUnitario`, descuento y subtotal ARS desde el importe y la cotización enviada. `FichaTrabajoResponse` devuelve ambos importes y la referencia guardada. El total, pagos, IVA y precios del catálogo permanecen en ARS.
- `ExchangeRateResponse` (`codigo`, `nombre`, `compra`, `venta`, `fuente`, `fechaActualizacion`) informa las cotizaciones actuales de venta desde DolarAPI; el servidor mantiene una caché de un minuto. Si la fuente falla, la ruta devuelve error recuperable y no se ofrece una cotización alternativa obsoleta.
- `TrabajoSugerenciaResponse` contiene `descripcion`, `fichas` y `usos`. Una sugerencia aparece cuando un trabajo no cancelado se repite en tres o más fichas no canceladas y no existe una descripción equivalente en el catálogo.
- `ClientCompletionRequest` recibe `documento`, `telefono`, `email`, `direccion` y `observaciones`; `ClientCompletionResponse` devuelve esos campos junto con el UUID y nombre del cliente. La auditoría registra la acción y el cliente sin copiar datos personales al detalle del evento.
- Pagos de fichas y repuestos usan `PagoRegistroRequest` con `monto`, `fecha?`, `medioPago?` e `idempotencyKey?`; anular conserva el movimiento en el historial.
- Las fotos de fichas se crean con `PhotoRequest` (`filename`, `contentType`, `base64`, `idempotencyKey?`) y se consultan con `/fichas/{id}/fotos/{fotoId}`. `GET /fichas/{id}/pdf` genera el PDF en el backend.
- Foto de la moto (una por motovehículo): `PUT /motovehiculos/{id}/imagen` recibe `VehicleImageRequest` (`filename?`, `contentType` WebP/JPEG/PNG, `miniaturaBase64` ≤ 100 KB, `completaBase64` ≤ 600 KB, `width`, `height`) y responde `VehicleImageResponse`; `DELETE /motovehiculos/{id}/imagen` la quita; `GET /motovehiculos/{id}/imagen?tamano=miniatura|completa&v=…` devuelve el binario con caché inmutable. Los listados de motos solo informan `imagenActualizadaAt` (la versión) y nunca incluyen los bytes.
- Las exportaciones XLSX disponibles son `/clientes/export.xlsx`, `/motovehiculos/export.xlsx`, `/fichas/export.xlsx`, `/repuestos/export.xlsx` y `/transferencias/export.xlsx`. Cada una recibe los filtros de su listado y admite `columns` opcional.
