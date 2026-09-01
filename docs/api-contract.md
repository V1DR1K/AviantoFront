# Contrato API — AviantoSoftware

Base URL: `/api`. El frontend usa DTOs; no expone entidades de persistencia.

## Convenciones

- Paginación: `page`, `size` (10, 20, 50, 100), `sortBy`, `direction` (`ASC`/`DESC`).
- Respuesta paginada: `content`, `page`, `size`, `totalElements`, `totalPages`, `sortBy`, `direction`.
- Errores: `400` validación, `404` inexistente, `409` regla de negocio, `422` transición de estado inválida, `500` inesperado.
- Borrado lógico: `DELETE` conserva historial y auditoría; `?includeDeleted=true` permite consulta administrativa.

## Recursos

| Recurso       | Endpoints                                                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clientes      | `GET/POST /clientes`, `GET/PUT/DELETE /clientes/{id}`, `GET /clientes/autocomplete?q=`                                                                                                                                                                  |
| Motovehículos | `GET/POST /motovehiculos`, `GET/PUT/DELETE /motovehiculos/{id}`, `GET /motovehiculos/autocomplete?q=`, `POST /motovehiculos/{id}/ingreso`, `PATCH /motovehiculos/{id}/circuito`, `GET /motovehiculos/{id}/venta`, `GET /motovehiculos/{id}/transferencias` |
| Fichas | `GET/POST /fichas`, `GET/PUT/DELETE /fichas/{id}`, `GET /fichas/{id}/repuestos`, `GET /fichas/{id}/trabajos`, `POST/PUT/DELETE /fichas/{id}/trabajos`, `PATCH /fichas/{id}/estado`, `GET/POST /fichas/{id}/pagos`, `POST /fichas/{id}/pagos/{pagoId}/anular`, `POST /fichas/{id}/entregar` |
| Ventas | `GET /ventas`, `GET /ventas/{id}`, `GET /motovehiculos/{id}/venta`, `PATCH /ventas/{id}/items/{itemId}`, `PUT /ventas/{id}/comprador`, `POST /ventas/{id}/transferencia`, `POST /ventas/{id}/transferencia/cancelar`, `PUT /ventas/{id}/transferencia/cita`, `POST /ventas/{id}/transferencia/asistencia`, `POST /ventas/{id}/completar` |
| Transferencias | `GET /transferencias`, `GET /transferencias/export.xlsx`, `GET /motovehiculos/{id}/transferencias`. Es un registro de solo lectura vinculado a la ficha de venta; no hay alta, edición ni baja genéricas. |
| Perfiles      | `GET/POST /perfiles`, `GET /perfiles/{id}`. La edición y baja lógica de la moto se realizan con `PUT/DELETE /motovehiculos/{id}`. Un perfil representa la vista integral de una moto, su propietario y su historial operativo.                 |
| Catálogo      | `GET/POST /catalogo-items`, `GET/PUT/DELETE /catalogo-items/{id}`, `GET /catalogo-items/{id}/price-history`, `GET /catalogo-items/duplicates?descripcion=`                                                                                              |
| Repuestos     | `GET/POST /repuestos`, `GET/PUT/DELETE /repuestos/{id}`, `PATCH /repuestos/{id}/estado`, `GET/POST /repuestos/{id}/pagos`, `POST /repuestos/{id}/pagos/{pagoId}/anular` |
| Auditoría     | `GET /auditoria`                                                                                                                                                                                                                                        |
| Reportes      | `GET /reportes/resumen`, `GET /reportes/evolucion`, `GET /reportes/top-items`                                                                                                                                                                           |
| Configuración | `GET/POST /configuracion/marcas-moto`, `GET/PUT/DELETE /configuracion/marcas-moto/{id}`, `GET/POST /configuracion/categorias-catalogo`, `GET/PUT/DELETE /configuracion/categorias-catalogo/{id}`, `GET/POST /usuarios`, `GET/PUT/DELETE /usuarios/{id}`, `GET/POST /configuracion/ventas/checklist`, `PUT/DELETE /configuracion/ventas/checklist/{id}` |
| Autenticación | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`                                                                                                                                                                           |

## Autenticación

- `POST /auth/login` recibe `{ username, password }` y devuelve `{ accessToken, refreshToken, user: { id, nombre, rol } }`.
- `POST /auth/refresh` recibe `{ refreshToken }` y devuelve el mismo objeto de sesión renovado.
- `POST /auth/logout` recibe `{ refreshToken }` e invalida la sesión asociada.
- `GET /auth/me` requiere `Authorization: Bearer <accessToken>` y devuelve el usuario activo sin credenciales.
- Los roles son `ADMINISTRACION` y `OPERARIO`. Los endpoints de configuración y usuarios requieren `ADMINISTRACION`.

## Filtros permitidos

- `GET /clientes`: `q`, `activo`, `includeDeleted`.
- `GET /clientes/autocomplete?q=` busca todos los clientes activos no eliminados por nombre, documento o teléfono, sin depender del dispositivo desde el que fueron creados.
- `GET /motovehiculos`: `q`, `clienteId`, `marcaId`, `activo`, `includeDeleted`.
- `GET /transferencias`: `q`, `fechaDesde`, `fechaHasta`, `sortBy`, `direction`.
- `GET /ventas`: `q` (número, patente o comprador prospectivo), `motoId`, `estado`, `page`, `size`, `sortBy` (`numero`, `createdAt`, `updatedAt`) y `direction`.
- `GET /perfiles`: `q` (dominio, moto o propietario) y `estado`. La búsqueda de dominio ignora mayúsculas, espacios y guiones.
- `GET /catalogo-items`: `q`, `tipo`, `categoriaId`, `activo`, `includeDeleted`.
- `GET /pedidos`: `q`, `clienteId`, `patente`, `numero`, `estado`, `documento`, `fechaDesde`, `fechaHasta`, `includeDeleted`.
- `GET /auditoria`: `q`, `usuarioId`, `modulo`, `accion`, `fechaDesde`, `fechaHasta`.
- Los endpoints de exportación reciben exactamente los filtros del recurso, además de `sortBy`, `direction` y `columns` opcional.

## DTOs de dominio

- `MarcaMoto`: `id`, `nombre`, `activo`, `createdAt`, `updatedAt`.
- `CategoriaCatalogo`: `id`, `nombre`, `activo`, `createdAt`, `updatedAt`.
- `Usuario`: `id`, `nombre`, `email`, `rol` (`ADMINISTRACION` | `OPERARIO`), `activo`, `createdAt`, `updatedAt`. Las credenciales y su hash no se devuelven nunca.
- `MotovehiculoRequest`: `clienteId`, `marcaId`, `modelo`, `patente`, `anio?`, `kilometraje?`, `color?`, `cilindrada?`, `observaciones?`. La respuesta expone adicionalmente `cliente` y `marca` como etiquetas de lectura.
- `VentaFichaResponse`: `id`, `numero`, `motoId`, `patente`, `moto`, `vendedorId`, `vendedor`, `compradorId?`, `comprador?`, `estado` (`En venta` | `Transferencia en proceso` | `Vendida` | `Cancelada`), `obligatoriosCompletos`, `finalizadaAt?`, `finalizadaPor?`, `canceladaAt?`, `canceladaPor?`, `canceladaMotivo?`, `items`, `transferencia?`, `creadaEn`, `actualizadaEn`.
- `VentaFichaItemResponse`: `id`, `etiqueta`, `orden`, `obligatorio`, `estado` (`Pendiente` | `Realizado` | `No aplica`), `realizadoAt?`, `realizadoPor?`. `PATCH /ventas/{id}/items/{itemId}` recibe `{ estado }`; Administración y Operario pueden actualizarlo mientras la ficha esté en venta. Los ítems obligatorios solo admiten `Pendiente` o `Realizado`.
- `VentaTransferenciaResponse`: `id`, `fechaTransferencia?`, `citaFecha?`, `citaHora?`, `citaLugar?`, `asistenciaAt?`, `asistenciaPor?`, `canceladaAt?`, `canceladaPor?`, `finalizadaAt?`, `finalizadaPor?`, `creadaEn`.
- `TransferResponse`: registro read-only con `id`, `motoId`, `patente`, `moto`, `clienteAnteriorId`, `clienteAnterior`, `clienteNuevoId`, `clienteNuevo`, `fechaTransferencia?`, `observaciones?`, `realizadaPor?`, `createdAt`, `fichaVentaId?`, `citaFecha?`, `citaHora?`, `citaLugar?`, `asistenciaAt?`, `asistenciaPor?`, `canceladaAt?`, `canceladaPor?`, `finalizadaAt?`, `finalizadaPor?`.
- `VentaChecklistPlantillaRequest`: `{ etiqueta, orden, obligatorio, activo }`. `VentaChecklistPlantillaResponse` agrega `id`, `createdAt`, `updatedAt`. Las plantillas activas se incorporan a fichas abiertas cuando todavía no tienen ese requisito; los estados existentes de la carpeta se conservan.
- `ProfileRequest`: `marcaId`, `modelo`, `patente`, `anio?`, `kilometraje?`, `observaciones?`, `clienteNombre`, `clienteTelefono`. Crea el cliente, la moto y su relación de propietario en una única operación.
- Una ficha pasa de `En proceso` a `En revisión` sólo por `PATCH /fichas/{id}/estado`. Todos sus trabajos deben estar realizados o cancelados, pero completar el último no dispara la transición automáticamente.
- `FichaResponse` y `RepuestoResponse` incluyen `estadoPago`, `montoCobrado` y `saldoPendiente`. Los importes de cada documento se calculan desde sus propios movimientos de pago; una ficha y sus repuestos vinculados no comparten historial ni movimientos.
- `PagoResponse`: `{ id, monto, fecha, medioPago?, anulado, anuladoAt? }`, donde `medioPago` puede ser `Efectivo`, `Transferencia`, `Débito`, `Crédito`, `Mercado Pago`, `Otro` o `null`.
- `GET /fichas/{id}/pagos` devuelve el historial de `PagoResponse`. `POST /fichas/{id}/pagos` recibe `{ monto, fecha?, medioPago? }`. `POST /fichas/{id}/pagos/{pagoId}/anular` anula el movimiento sin eliminarlo del historial. Los mismos endpoints, cuerpos y reglas aplican a `/repuestos/{id}/pagos`.
- Los documentos cancelados no admiten nuevos pagos. Anular un pago recalcula `montoCobrado`, `saldoPendiente` y el `estadoPago` del documento.
- `GET /fichas/{id}/repuestos` devuelve exclusivamente los pedidos de repuestos y accesorios vinculados a esa ficha. El resumen de ficha y su PDF muestran esos pedidos separados del total persistido de trabajos y calculan el total de presupuesto como ambos importes combinados.
- El perfil expone la sección actual (`Taller` o `Venta`), la presencia física (`ingresada`) y el estado operativo. `Disponible` significa que la moto está registrada, fuera de ambos circuitos y no ingresada; no significa que esté a la venta. Taller usa `Ingresada Taller`, `Pendiente`, `En proceso`, `En revisión`, `Terminada`, `Entregada`; ingresar directamente en Ventas crea la moto en `En venta`, seguida por `Transferencia en proceso` y `Vendida`. `Disponible` y `En venta` son mutuamente excluyentes. Aprobar la revisión deja la ficha `Terminada`; `POST /fichas/{id}/entregar` registra la entrega al cliente.
- `POST /motovehiculos/{id}/ingreso` con `{ seccion: "VENTA" }` requiere `ADMINISTRACION` y crea automáticamente una ficha numerada `V-{n}`. `PATCH /motovehiculos/{id}/circuito` recibe `{ seccion: "TALLER|VENTA", motivo }`, exige motivo y registra usuario, fecha, origen, destino y motivo en auditoría. Administración y Operario pueden cambiar entre ambos circuitos antes de iniciar procesos. El cambio bloquea fichas de Taller abiertas, pedidos de repuestos no cancelados, pagos vigentes, transferencias activas y ventas finalizadas. La ficha de Venta abierta que origina el pase a Taller es la excepción controlada: se marca `Cancelada`, conserva su historial y el motivo, sin eliminarse. La ruta histórica `POST /motovehiculos/{id}/venta/completar` no debe usarse desde interfaz: el cierre se realiza exclusivamente desde `POST /ventas/{id}/completar`.
- El vendedor conserva la titularidad hasta la finalización. En `En venta`, comprador prospectivo y carpeta pueden trabajarse en paralelo. Administración selecciona comprador, inicia o cancela transferencia, programa/reprograma cita, confirma asistencia y completa la venta. Operario solo consulta la ficha y actualiza requisitos de la carpeta.
- Iniciar transferencia exige comprador prospectivo y checklist obligatorio realizado. Una transferencia no finalizada puede cancelarse desde `POST /ventas/{id}/transferencia/cancelar`: la moto vuelve a `En venta`, el comprador prospectivo se libera y el registro conserva su auditoría. Completar la venta exige además cita completa, no futura para registrar asistencia, asistencia confirmada y propietario actual coincidente con el vendedor. `Vendida` es terminal.
- `ItemCatalogoRequest`: `descripcion`, `tipo` (`Pieza` | `Trabajo`), `categoriaId`, `precioBase` numérico no negativo, `observaciones?`. **No existe código interno.** La respuesta expone `categoria` como etiqueta de lectura.
- `PedidoRequest`: `clienteId`, `motovehiculoId`, `documento` (`Presupuesto` | `Factura`), `vencimiento`, `observaciones`, `descuentoGlobal`, `iva` e `items`. El backend debe validar que la moto pertenezca al cliente.

`PedidoRequest` incluye cliente, motovehículo, tipo de documento, vencimiento, observaciones, descuentos, IVA e `items[]`. Cada línea porta un snapshot de descripción, tipo, cantidad, precio y descuento: el cambio futuro de catálogo no altera el documento histórico.

## Reglas de configuración

- Las marcas y categorías se eliminan lógicamente. No se permite desactivarlas (`409`) si tienen motos o ítems activos asociados; se debe informar la dependencia.
- Los usuarios se eliminan lógicamente. No puede desactivarse el último usuario con rol `ADMINISTRACION` (`409`).
- La carpeta de transferencia es exclusiva de `ADMINISTRACION`. Sus requisitos activos se reflejan en fichas abiertas; las fichas canceladas o finalizadas no se modifican.
- Las marcas y categorías se entregan ordenadas alfabéticamente y solo las activas se usan en los selectores de alta/edición.
- `PATCH /pedidos/{id}/estado` recibe `{ "estado": "En proceso|Aprobado|Pagado|Cancelado" }`; el backend responde el pedido actualizado y registra auditoría.

## Exportaciones y PDF

- `GET /{recurso}/export.xlsx` recibe los mismos filtros y ordenamientos; exporta todos los resultados filtrados, columnas solicitadas y una fecha/hora de generación.
- `GET /pedidos/{id}/pdf` genera el documento profesional en el servidor. Durante el MVP el cliente usa `jspdf` con datos mock.

## Fotos MVP

`POST /pedidos/{id}/fotos` acepta `{ filename, contentType, base64 }`. En producción se reemplaza por URL prefirmada/objeto de almacenamiento, manteniendo el DTO de metadatos.

## Cache

El cliente indexa consultas por recurso, página, tamaño, orden y filtros; invalida tras alta, edición, borrado lógico, cambio de estado o precio. El backend debe usar Spring Cache con Caffeine para catálogo, marcas, categorías, autocomplete y consultas frecuentes; evaluar Redis al escalar. Verificación: primera consulta miss, segunda hit, mutación evacúa, tercera devuelve datos nuevos.
