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
| Motovehículos | `GET/POST /motovehiculos`, `GET/PUT/DELETE /motovehiculos/{id}`, `GET /motovehiculos/autocomplete?q=`, `POST /motovehiculos/{id}/ingreso`, `POST /motovehiculos/{id}/venta/completar` |
| Fichas | `GET/POST /fichas`, `GET/PUT/DELETE /fichas/{id}`, `GET /fichas/{id}/repuestos`, `PATCH /fichas/{id}/estado`, `POST /fichas/{id}/entregar` |
| Transferencias | `GET /transferencias`, `POST /transferencias`, `PUT/DELETE /transferencias/{id}`, `GET /transferencias/export.xlsx`, `GET /motovehiculos/{id}/transferencias`                                                                                 |
| Perfiles      | `GET/POST /perfiles`, `GET /perfiles/{id}`. La edición y baja lógica de la moto se realizan con `PUT/DELETE /motovehiculos/{id}`. Un perfil representa la vista integral de una moto, su propietario y su historial operativo.                 |
| Catálogo      | `GET/POST /catalogo-items`, `GET/PUT/DELETE /catalogo-items/{id}`, `GET /catalogo-items/{id}/price-history`, `GET /catalogo-items/duplicates?descripcion=`                                                                                              |
| Pedidos       | `GET/POST /pedidos`, `GET/PUT/DELETE /pedidos/{id}`, `PATCH /pedidos/{id}/estado`, `POST /pedidos/{id}/duplicate`                                                                                                                                       |
| Auditoría     | `GET /auditoria`                                                                                                                                                                                                                                        |
| Reportes      | `GET /reportes/resumen`, `GET /reportes/evolucion`, `GET /reportes/top-items`                                                                                                                                                                           |
| Configuración | `GET/POST /configuracion/marcas-moto`, `GET/PUT/DELETE /configuracion/marcas-moto/{id}`, `GET/POST /configuracion/categorias-catalogo`, `GET/PUT/DELETE /configuracion/categorias-catalogo/{id}`, `GET/POST /usuarios`, `GET/PUT/DELETE /usuarios/{id}` |
| Autenticación | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`                                                                                                                                                                           |

## Autenticación

- `POST /auth/login` recibe `{ username, password }` y devuelve `{ accessToken, refreshToken, user: { id, nombre, rol } }`.
- `POST /auth/refresh` recibe `{ refreshToken }` y devuelve el mismo objeto de sesión renovado.
- `POST /auth/logout` recibe `{ refreshToken }` e invalida la sesión asociada.
- `GET /auth/me` requiere `Authorization: Bearer <accessToken>` y devuelve el usuario activo sin credenciales.
- Los roles son `ADMINISTRACION` y `OPERARIO`. Los endpoints de configuración y usuarios requieren `ADMINISTRACION`.

## Filtros permitidos

- `GET /clientes`: `q`, `activo`, `includeDeleted`.
- `GET /motovehiculos`: `q`, `clienteId`, `marcaId`, `activo`, `includeDeleted`.
- `GET /transferencias`: `q`, `fechaDesde`, `fechaHasta`, `sortBy`, `direction`.
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
- `TransferRequest`: `motoId`, `clienteNuevoId`, `fechaTransferencia`, `observaciones?`. Solo `ADMINISTRACION` puede crear una transferencia.
- `TransferUpdateRequest`: `clienteNuevoId`, `fechaTransferencia`, `observaciones?`. Solo `ADMINISTRACION` puede editar o dar de baja una transferencia; ambas operaciones recalculan los períodos de propietarios y conservan las filas mediante borrado lógico.
- `TransferResponse`: `id`, `motoId`, `patente`, `moto`, `clienteAnteriorId`, `clienteAnterior`, `clienteNuevoId`, `clienteNuevo`, `fechaTransferencia`, `observaciones`, `realizadaPor`, `createdAt`.
- `ProfileRequest`: `marcaId`, `modelo`, `patente`, `anio?`, `kilometraje?`, `observaciones?`, `clienteNombre`, `clienteTelefono`. Crea el cliente, la moto y su relación de propietario en una única operación.
- Una ficha pasa de `En proceso` a `En revisión` sólo por `PATCH /fichas/{id}/estado`. Todos sus trabajos deben estar realizados o cancelados, pero completar el último no dispara la transición automáticamente.
- `GET /fichas/{id}/repuestos` devuelve exclusivamente los pedidos de repuestos y accesorios vinculados a esa ficha. El resumen de ficha y su PDF muestran esos pedidos separados del total persistido de trabajos y calculan el total de presupuesto como ambos importes combinados.
- El perfil expone la sección actual (`Taller` o `Venta`), la presencia física (`ingresada`) y el estado operativo. `Disponible` significa que la moto está registrada, fuera de ambos circuitos y no ingresada; no significa que esté a la venta. Taller usa `Ingresada Taller`, `Pendiente`, `En proceso`, `En revisión`, `Terminada`, `Entregada`; ingresar directamente en Ventas crea la moto en `En venta`, seguida por `Transferencia en proceso` y `Vendida`. `Disponible` y `En venta` son mutuamente excluyentes. Aprobar la revisión deja la ficha `Terminada`; `POST /fichas/{id}/entregar` registra la entrega al cliente.
- `ItemCatalogoRequest`: `descripcion`, `tipo` (`Pieza` | `Trabajo`), `categoriaId`, `precioBase` numérico no negativo, `observaciones?`. **No existe código interno.** La respuesta expone `categoria` como etiqueta de lectura.
- `PedidoRequest`: `clienteId`, `motovehiculoId`, `documento` (`Presupuesto` | `Factura`), `vencimiento`, `observaciones`, `descuentoGlobal`, `iva` e `items`. El backend debe validar que la moto pertenezca al cliente.

`PedidoRequest` incluye cliente, motovehículo, tipo de documento, vencimiento, observaciones, descuentos, IVA e `items[]`. Cada línea porta un snapshot de descripción, tipo, cantidad, precio y descuento: el cambio futuro de catálogo no altera el documento histórico.

## Reglas de configuración

- Las marcas y categorías se eliminan lógicamente. No se permite desactivarlas (`409`) si tienen motos o ítems activos asociados; se debe informar la dependencia.
- Los usuarios se eliminan lógicamente. No puede desactivarse el último usuario con rol `ADMINISTRACION` (`409`).
- Las marcas y categorías se entregan ordenadas alfabéticamente y solo las activas se usan en los selectores de alta/edición.
- `PATCH /pedidos/{id}/estado` recibe `{ "estado": "En proceso|Aprobado|Pagado|Cancelado" }`; el backend responde el pedido actualizado y registra auditoría.

## Exportaciones y PDF

- `GET /{recurso}/export.xlsx` recibe los mismos filtros y ordenamientos; exporta todos los resultados filtrados, columnas solicitadas y una fecha/hora de generación.
- `GET /pedidos/{id}/pdf` genera el documento profesional en el servidor. Durante el MVP el cliente usa `jspdf` con datos mock.

## Fotos MVP

`POST /pedidos/{id}/fotos` acepta `{ filename, contentType, base64 }`. En producción se reemplaza por URL prefirmada/objeto de almacenamiento, manteniendo el DTO de metadatos.

## Cache

El cliente indexa consultas por recurso, página, tamaño, orden y filtros; invalida tras alta, edición, borrado lógico, cambio de estado o precio. El backend debe usar Spring Cache con Caffeine para catálogo, marcas, categorías, autocomplete y consultas frecuentes; evaluar Redis al escalar. Verificación: primera consulta miss, segunda hit, mutación evacúa, tercera devuelve datos nuevos.
