export type FichaStatus = "Ingresada" | "En trabajo" | "Para control" | "Para entrega" | "Entregada" | "Cancelada";
export type PagoStatus = "Pendiente" | "Parcial" | "Pagado";
export type TrabajoStatus = "Pendiente" | "En proceso" | "Realizado" | "Cancelado";
export type DocumentType = "Presupuesto" | "Factura";
export type ItemType = "Pieza" | "Trabajo";
export type EstadoMotoType = "Activa" | "En taller" | "Para entrega";
export type RepuestoItemType = "Repuesto" | "Accesorio";
export type RepuestoItemState = "Pendiente de pedir" | "Pedido" | "Recibido" | "Entregado" | "Cancelado";
export type RepuestoState = "En curso" | "Completado" | "Cancelado";
export type RepuestoPagoState = "No pagado" | "Pago parcial" | "Pagado";
export type RevisionState = "ABIERTA" | "APROBADA";
export type RevisionControlState = "Pendiente" | "Aprobado" | "Requiere corrección" | "No aplica";

export interface PageRequest {
  page: number;
  size: number;
  sortBy?: string;
  direction?: "ASC" | "DESC";
  filtros?: Record<string, string | string[] | boolean | undefined>;
}
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sortBy: string;
  direction: "ASC" | "DESC";
}

export interface ClienteRequest {
  nombre: string;
  documento?: string;
  telefono: string;
  email?: string;
  direccion?: string;
  observaciones?: string;
}
export interface ClienteResponse extends ClienteRequest {
  id: string;
  activo: boolean;
  motos: number;
  pedidos: number;
}
export interface MarcaMotoResponse { id: string; nombre: string; activo: boolean; createdAt?: string; updatedAt?: string; }
export interface CategoriaCatalogoResponse { id: string; nombre: string; activo: boolean; createdAt?: string; updatedAt?: string; }
export interface UsuarioResponse {
  id: string;
  nombre: string;
  email: string;
  rol: "ADMINISTRACION" | "OPERARIO";
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export interface MotovehiculoRequest {
  clienteId: string;
  marcaId: string;
  modelo: string;
  patente: string;
  anio?: number;
  kilometraje?: number;
  observaciones?: string;
}
export interface MotovehiculoResponse extends MotovehiculoRequest {
  id: string;
  cliente: string;
  marca: string;
  estado: EstadoMotoType;
  kmUltimoService?: number | null;
  fechaUltimoService?: string | null;
  kmServicePeriodo: number | null;
  mesesServicePeriodo: number | null;
  serviceObservaciones?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface MotoConfigServiceRequest {
  kmServicePeriodo?: number;
  mesesServicePeriodo?: number;
  serviceObservaciones?: string;
}
export interface ItemCatalogoRequest {
  descripcion: string;
  tipo: ItemType;
  precioBase: number;
  categoriaId: string;
  observaciones?: string;
}
export interface ItemCatalogoResponse extends ItemCatalogoRequest {
  id: string;
  categoria: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FichaItemRequest {
  itemCatalogoId?: string;
  descripcion: string;
  tipo: ItemType;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  estadoTrabajo?: TrabajoStatus;
  observacionTrabajo?: string;
}
export interface FichaItemResponse {
  id: string;
  itemCatalogoId?: string;
  descripcion: string;
  tipo: ItemType;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  estadoTrabajo: TrabajoStatus;
  observacionTrabajo?: string | null;
  completadoAt?: string | null;
  completadoPor?: string | null;
}
export interface PhotoResponse {
  id: string;
  filename: string;
  contentType: string;
  createdAt: string;
  url: string;
}
export interface FichaRequest {
  clienteId: string;
  motoId: string;
  fechaIngreso?: string;
  fechaEntregaEstimada?: string;
  kilometrajeIngreso?: number;
  documento: DocumentType;
  vencimiento?: string;
  observaciones?: string;
  descuentoGlobal: number;
  iva: boolean;
  items: FichaItemRequest[];
}
export interface FichaResponse {
  id: string;
  numero: string;
  clienteId: string;
  cliente: string;
  motoId: string;
  moto: string;
  patente: string;
  documento: DocumentType;
  vencimiento: string | null;
  fechaIngreso: string;
  fechaEntregaEstimada: string | null;
  fechaEntregaReal?: string | null;
  kilometrajeIngreso?: number | null;
  observaciones?: string | null;
  descuentoGlobal: number;
  iva: boolean;
  estado: FichaStatus;
  estadoPago: PagoStatus;
  total: number;
  creadoEn: string;
  items: FichaItemResponse[];
  fotos: PhotoResponse[];
}
export interface OwnerRequest { clienteId: string; fechaDesde?: string; observaciones?: string; }
export interface OwnerResponse {
  id: string;
  clienteId: string;
  cliente: string;
  fechaDesde: string;
  fechaHasta: string;
  actual: boolean;
  observaciones?: string;
}
export interface ServiceRequest {
  fichaId?: string;
  kilometraje: number;
  fecha?: string;
  observaciones?: string;
}
export interface ServiceResponse {
  id: string;
  motoId: string;
  fichaId?: string | null;
  fichaNumero?: string | null;
  kilometraje: number;
  fecha: string;
  observaciones?: string | null;
  realizadoPor?: string | null;
  creadoEn: string;
}
export interface NextServiceResponse {
  motoId: string;
  patente: string;
  cliente: string;
  moto: string;
  kilometraje: number | null;
  kmUltimoService: number | null;
  fechaUltimoService: string | null;
  kmServicePeriodo: number | null;
  mesesServicePeriodo: number | null;
  proximKm: number | null;
  kmFaltan: number;
  proximaFecha: string | null;
  diasFaltan: number | null;
  atrasadoKm: boolean;
  atrasadoFecha: boolean;
  sinReferencia: boolean;
}
export interface RepuestoItemRequest {
  descripcion: string;
  tipo: RepuestoItemType;
  cantidad: number;
  precio: number;
  estado?: string;
  observaciones?: string;
}
export interface RepuestoItemResponse {
  id: string;
  descripcion: string;
  tipo: RepuestoItemType;
  cantidad: number;
  precio: number;
  subtotal: number;
  estado: RepuestoItemState;
  observaciones?: string | null;
}
export interface RepuestoRequest {
  motoVehiculoId: string;
  clienteId: string;
  fichaId?: string;
  fecha?: string;
  proveedor?: string;
  observaciones?: string;
  items: RepuestoItemRequest[];
}
export interface RepuestoResponse {
  id: string;
  numero: string;
  motoId: string;
  patente: string;
  clienteId: string;
  cliente: string;
  fichaId?: string | null;
  fecha: string;
  estado: RepuestoState;
  estadoPago: RepuestoPagoState;
  total: number;
  proveedor?: string | null;
  observaciones?: string | null;
  items: RepuestoItemResponse[];
  creadoEn: string;
}
export interface ControlResponse {
  id: string;
  nombre: string;
  descripcion?: string;
  obligatorio: boolean;
  orden: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface ControlRequest {
  nombre: string;
  descripcion?: string;
  obligatorio?: boolean;
  orden?: number;
  activo?: boolean;
}
export interface RevisionControlResponse {
  id: string;
  controlId: string;
  control: string;
  obligatorio: boolean;
  orden: number;
  estado: RevisionControlState;
  observacion?: string | null;
  correccionNecesaria?: string | null;
  revisadoPor?: string | null;
  revisadoAt?: string | null;
}
export interface RevisionResponse {
  id: string;
  fichaId: string;
  ficha: string;
  estado: RevisionState;
  aprobadoPor?: string | null;
  aprobadoAt?: string | null;
  forzada: boolean;
  observacion?: string | null;
  controles: RevisionControlResponse[];
}
export interface AuditoriaResponse {
  id: string;
  fecha: string;
  usuario: string;
  modulo: string;
  accion: string;
  descripcion: string;
}
export interface ReporteResponse { etiqueta: string; valor: number; }
export interface DashboardDayResponse { fecha: string; total: number; }
export interface DashboardOrderResponse { id: string; numero: string; cliente: string; moto: string; estado: FichaStatus; total: number; createdAt: string; }
export interface DashboardResponse {
  fechaDesde: string;
  fechaHasta: string;
  pedidos: number;
  enProceso: number;
  aprobados: number;
  pagados: number;
  cancelados: number;
  presupuestado: number;
  facturado: number;
  evolucion: DashboardDayResponse[];
  recientes: DashboardOrderResponse[];
}
export interface AutocompleteResponse { id: string; label: string; secondary?: string; }