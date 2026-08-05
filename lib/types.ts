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
}
export interface MotovehiculoRequest {
  clienteId: string;
  marca: string;
  marcaId?: string;
  modelo: string;
  patente: string;
  anio?: number;
  kilometraje?: number;
  color?: string;
  cilindrada?: string;
  observaciones?: string;
}
export interface MotovehiculoResponse extends MotovehiculoRequest {
  id: string;
  cliente: string;
  activo: boolean;
}
export interface ItemCatalogoRequest {
  descripcion: string;
  tipo: ItemType;
  precioBase: number;
  categoria?: string;
  categoriaId?: string;
  observaciones?: string;
}
export interface ItemCatalogoResponse extends ItemCatalogoRequest {
  id: string;
  activo: boolean;
  actualizadoEn: string;
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
  fotos: string[];
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
export interface AutocompleteResponse {
  id: string;
  label: string;
  secondary?: string;
}
