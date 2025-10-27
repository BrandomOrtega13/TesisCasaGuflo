// src/types.ts
export type Role = 'ADMIN' | 'OPERADOR';

export interface User {
  id: number;
  name: string;
  role: Role;
}

export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  categoria: string;
  um: string;
  stock: number;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Movimiento {
  id: number;
  tipo: 'INGRESO' | 'DESPACHO';
  productoId: number;
  cantidad: number;
  ref?: string;
  userId: number;
  createdAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
}
