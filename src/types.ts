export type UUID = string;
export type Role = 'ADMIN' | 'OPERADOR';

export interface User {
  id: UUID;
  nombre: string;
  email: string;
  rol: Role;
}

export interface Categoria {
  id: UUID;
  nombre: string;
  descripcion?: string;
}

export interface Proveedor {
  id: UUID;
  nombre: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
}

export interface Unidad {
  id: UUID;
  codigo: string;
  nombre: string;
}

export interface Bodega {
  id: UUID;
  nombre: string;
  direccion?: string;
}

export interface Cliente {
  id: UUID;
  identificacion?: string;
  nombre: string;
  telefono?: string;
  correo?: string;
}

export interface Producto {
  id: UUID;
  sku: string;
  nombre: string;
  categoria_id?: UUID;
  proveedor_id?: UUID;
  unidad_id?: UUID;
  precio_compra?: number;
  precio_venta?: number;
  activo: boolean;
  creado_en?: string;

  // Datos que el backend puede adjuntar
  categoria_nombre?: string;
  proveedor_nombre?: string;
  unidad_codigo?: string;
  stock_total?: number;
}

export interface MovimientoDetalleReq {
  producto_id: UUID;
  cantidad: number;
  costo_unitario?: number;
  precio_unitario?: number;
}

export type TipoMovimiento = 'INGRESO' | 'DESPACHO' | 'AJUSTE';

export interface Movimiento {
  id: UUID;
  tipo: TipoMovimiento;
  fecha: string;
  bodega_id: UUID;
  proveedor_id?: UUID;
  cliente_id?: UUID;
  usuario_id?: UUID;
  observacion?: string;
}

export interface MovimientoConDetalles extends Movimiento {
  detalles: {
    id: UUID;
    producto_id: UUID;
    producto_nombre?: string;
    cantidad: number;
    costo_unitario?: number;
    precio_unitario?: number;
  }[];
}

export interface Paged<T> {
  items: T[];
  total: number;
}
