export type OrderStatus = "En proceso" | "Aprobado" | "Pagado" | "Cancelado";
export type DocumentType = "Presupuesto" | "Factura";
export type ItemType = "Pieza" | "Trabajo";

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
export interface MarcaMotoResponse {
  id: string;
  nombre: string;
  activo: boolean;
}
export interface CategoriaCatalogoResponse {
  id: string;
  nombre: string;
  activo: boolean;
}
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
  activo: boolean;
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
export interface PedidoItemRequest {
  itemCatalogoId?: string;
  descripcion: string;
  tipo: ItemType;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
}
export interface PedidoItemResponse extends PedidoItemRequest {
  id: string;
  subtotal: number;
}
export interface PhotoResponse {
  id: string;
  filename: string;
  contentType: string;
  createdAt: string;
  url: string;
}
export interface PedidoRequest {
  clienteId: string;
  motovehiculoId: string;
  documento: DocumentType;
  vencimiento: string;
  observaciones: string;
  items: PedidoItemRequest[];
  descuentoGlobal: number;
  iva: boolean;
}
export interface PedidoResponse extends PedidoRequest {
  id: string;
  numero: string;
  cliente: string;
  moto: string;
  patente: string;
  creadoEn: string;
  estado: OrderStatus;
  total: number;
  fotos: PhotoResponse[];
  items: PedidoItemResponse[];
}
export interface AuditoriaResponse {
  id: string;
  fecha: string;
  usuario: string;
  modulo: string;
  accion: string;
  descripcion: string;
}
export interface ReporteResponse {
  etiqueta: string;
  valor: number;
}
export interface DashboardDayResponse { fecha: string; total: number; }
export interface DashboardOrderResponse { id: string; numero: string; cliente: string; moto: string; estado: OrderStatus; total: number; createdAt: string; }
export interface DashboardResponse { fechaDesde: string; fechaHasta: string; pedidos: number; enProceso: number; aprobados: number; pagados: number; cancelados: number; presupuestado: number; facturado: number; evolucion: DashboardDayResponse[]; recientes: DashboardOrderResponse[]; }
export interface AutocompleteResponse {
  id: string;
  label: string;
  secondary?: string;
}
