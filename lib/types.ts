export type FichaStatus = "Pendiente" | "En proceso" | "En revisión" | "Terminada" | "Entregada" | "Cancelada";
export type MotoSection = "Taller" | "Venta";
export type MotoStatus = "Disponible" | "Ingresada Taller" | "Pendiente" | "En proceso" | "En revisión" | "Terminada" | "Entregada" | "En venta" | "Transferencia en proceso" | "Vendida";
export type PagoStatus = "No pagado" | "Parcial" | "Pagado";
export type PaymentMethod = "Efectivo" | "Transferencia" | "Débito" | "Crédito" | "Mercado Pago" | "Otro";
export type TrabajoStatus = "Pendiente" | "Realizado" | "Cancelado";
export type RepuestoItemType = "REPUESTO" | "ACCESORIO";export type RepuestoItemState = "Pendiente de pedir" | "Pedido" | "Recibido" | "Entregado" | "Cancelado";
export type RepuestoState = "En curso" | "Completado" | "Cancelado";
export type RevisionState = "ABIERTA" | "APROBADA";
export type RevisionControlState = "Pendiente" | "Revisado" | "No aplica";
export type VentaFichaStatus = "En venta" | "Transferencia en proceso" | "Vendida" | "Cancelada";
export type VentaChecklistItemState = "Pendiente" | "Realizado" | "No aplica";

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
  fichas: number;
  createdAt?: string;
  updatedAt?: string;
}
export interface MarcaMotoResponse { id: string; nombre: string; activo: boolean; createdAt?: string; updatedAt?: string; }
export interface CategoriaResponse { id: string; nombre: string; activo: boolean; createdAt?: string; updatedAt?: string; }
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
  clienteId?: string;
  marcaId: string;
  modelo: string;
  patente: string;
  anio?: number;
  kilometraje?: number;
  observaciones?: string;
}
export interface MotovehiculoResponse {
  id: string;
  propietarioId?: string | null;
  propietario?: string | null;
  marcaId: string;
  marca: string;
  modelo: string;
  patente: string;
  anio?: number | null;
  kilometraje?: number | null;
  seccion?: MotoSection | null;
  ingresada: boolean;
  estado: MotoStatus;
  kmUltimoService?: number | null;
  fechaUltimoService?: string | null;
  kmServicePeriodo: number | null;
  mesesServicePeriodo: number | null;
  serviceObservaciones?: string | null;
  observaciones?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  ultimaModificacion?: string;
}
export interface PerfilRequest {
  marcaId: string;
  modelo: string;
  patente: string;
  anio?: number;
  kilometraje?: number;
  observaciones?: string;
  clienteId?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
}
export type PerfilResponse = MotovehiculoResponse;
export interface MotoConfigServiceRequest {
  kmServicePeriodo?: number;
  mesesServicePeriodo?: number;
  serviceObservaciones?: string;
}
export interface TrabajoCatalogoResponse {
  id: string;
  descripcion: string;
  precioBase: number;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FichaTrabajoRequest {
  id?: string;
  descripcion: string;
  precioUnitario: number;
  descuento: number;
  estadoTrabajo?: TrabajoStatus;
  observacionTrabajo?: string;
}
export interface FichaTrabajoResponse {
  id: string;
  descripcion: string;
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
  observaciones?: string;
  descuentoGlobal: number;
  iva: boolean;
  trabajos: FichaTrabajoRequest[];
}
export interface FichaResponse {
  id: string;
  numero: string;
  clienteId: string;
  cliente: string;
  motoId: string;
  moto: string;
  patente: string;
  fechaIngreso: string;
  fechaEntregaEstimada?: string | null;
  fechaEntregaReal?: string | null;
  kilometrajeIngreso?: number | null;
  observaciones?: string | null;
  descuentoGlobal: number;
  iva: boolean;
  estado: FichaStatus;
  estadoPago: PagoStatus;
  total: number;
  montoCobrado: number;
  saldoPendiente: number;
  creadoEn: string;
  trabajos: FichaTrabajoResponse[];
  fotos: PhotoResponse[];
}
export interface OwnerRequest { clienteId: string; fechaDesde?: string; observaciones?: string; }
export interface OwnerResponse {
  id: string;
  clienteId: string;
  cliente: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
  actual: boolean;
  observaciones?: string;
}
export interface TransferResponse {
  id: string;
  motoId: string;
  patente: string;
  moto: string;
  clienteAnteriorId: string;
  clienteAnterior: string;
  clienteNuevoId: string;
  clienteNuevo: string;
  fechaTransferencia?: string | null;
  observaciones?: string | null;
  realizadaPor?: string | null;
  createdAt: string;
  fichaVentaId?: string | null;
  citaFecha?: string | null;
  citaHora?: string | null;
  citaLugar?: string | null;
  asistenciaAt?: string | null;
  asistenciaPor?: string | null;
  canceladaAt?: string | null;
  canceladaPor?: string | null;
  finalizadaAt?: string | null;
  finalizadaPor?: string | null;
}
export interface VentaChecklistPlantillaRequest {
  etiqueta: string;
  orden: number;
  obligatorio: boolean;
  activo: boolean;
}
export interface VentaChecklistPlantillaResponse extends VentaChecklistPlantillaRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface VentaFichaItemResponse {
  id: string;
  etiqueta: string;
  orden: number;
  obligatorio: boolean;
  estado: VentaChecklistItemState;
  realizadoAt?: string | null;
  realizadoPor?: string | null;
}
export interface VentaTransferenciaResponse {
  id: string;
  fechaTransferencia?: string | null;
  citaFecha?: string | null;
  citaHora?: string | null;
  citaLugar?: string | null;
  asistenciaAt?: string | null;
  asistenciaPor?: string | null;
  canceladaAt?: string | null;
  canceladaPor?: string | null;
  finalizadaAt?: string | null;
  finalizadaPor?: string | null;
  creadaEn: string;
}
export interface VentaFichaResponse {
  id: string;
  numero: string;
  motoId: string;
  patente: string;
  moto: string;
  vendedorId: string;
  vendedor: string;
  compradorId?: string | null;
  comprador?: string | null;
  estado: VentaFichaStatus;
  obligatoriosCompletos: boolean;
  finalizadaAt?: string | null;
  finalizadaPor?: string | null;
  canceladaAt?: string | null;
  canceladaPor?: string | null;
  canceladaMotivo?: string | null;
  items: VentaFichaItemResponse[];
  transferencia?: VentaTransferenciaResponse | null;
  creadaEn: string;
  actualizadaEn: string;
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
  cliente: string | null;
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
  fichaTrabajoId?: string;
  cantidad: number;
  precio: number;
  estado?: string;
  observaciones?: string;
}
export interface RepuestoItemResponse {
  id: string;
  fichaTrabajoId?: string | null;
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
  estadoPago: PagoStatus;
  total: number;
  montoCobrado: number;
  saldoPendiente: number;
  proveedor?: string | null;
  observaciones?: string | null;
  items: RepuestoItemResponse[];
  creadoEn: string;
}
export interface PagoResponse {
  id: string;
  monto: number;
  fecha: string;
  medioPago?: PaymentMethod | null;
  anulado: boolean;
  anuladoAt?: string | null;
}
export interface ControlRequest {
  nombre: string;
  descripcion?: string;
  obligatorio?: boolean;
  orden?: number;
  activo?: boolean;
  categoriaIds?: string[];
}
export interface ControlResponse {
  id: string;
  nombre: string;
  descripcion?: string;
  obligatorio: boolean;
  orden: number;
  activo: boolean;
  categorias: CategoriaResponse[];
  createdAt: string;
  updatedAt: string;
}
export interface RevisionControlResponse {
  id: string;
  controlId: string;
  control: string;
  categorias: string;
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
  usuario: string | null;
  modulo: string;
  accion: string;
  descripcion: string;
}
export interface ReporteResponse { etiqueta: string; valor: number; }
export interface DashboardOrderResponse { id: string; numero: string; cliente: string; moto: string; estado: FichaStatus; total: number; createdAt: string; }
export interface DashboardResponse {
  fechaDesde: string;
  fechaHasta: string;
  fichas: number;
  recientes: DashboardOrderResponse[];
}
export interface TallerMotoResponse {
  motoId: string;
  patente: string;
  moto: string;
  cliente: string | null;
  kilometraje: number | null;
  fichaId: string | null;
  fichaNumero: string | null;
  estado: MotoStatus;
  fechaIngreso: string | null;
}
export interface TallerEstadoResponse { estado: MotoStatus; motos: TallerMotoResponse[]; }
export interface TallerResponse { estados: TallerEstadoResponse[]; }
export interface DashboardFichaResponse {
  id: string;
  numero: string;
  cliente: string;
  moto: string;
  patente: string;
  estado: FichaStatus;
  total: number;
  fechaIngreso: string | null;
}
export interface DashboardFichaEstadoResponse { estado: FichaStatus; fichas: DashboardFichaResponse[]; }
export interface DashboardFichasResponse { estados: DashboardFichaEstadoResponse[]; }
export interface VentaMotoResponse { motoId: string; patente: string; moto: string; cliente: string | null; kilometraje: number | null; estado: MotoStatus; fechaIngreso: string | null; }
export interface VentaEstadoResponse { estado: MotoStatus; motos: VentaMotoResponse[]; }
export interface VentaResponse { estados: VentaEstadoResponse[]; }
export interface AutocompleteResponse { id: string; label: string; secondary?: string; }
