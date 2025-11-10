-- 1. Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enumerado para movimientos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento') THEN
    CREATE TYPE tipo_movimiento AS ENUM ('INGRESO', 'DESPACHO', 'AJUSTE');
  END IF;
END$$;

-- 3. Creacion de Tablas

-- Categorias
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT
);

-- Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  contacto TEXT,
  telefono TEXT,
  correo TEXT
);

-- Unidades
CREATE TABLE IF NOT EXISTS unidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT NOT NULL UNIQUE,       -- p.ej., 'UND', 'CJ', 'KG'
  nombre TEXT NOT NULL
);

-- Productos
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  categoria_id UUID REFERENCES categorias(id) ON UPDATE CASCADE,
  proveedor_id UUID REFERENCES proveedores(id) ON UPDATE CASCADE,
  unidad_id UUID REFERENCES unidades(id) ON UPDATE CASCADE,
  precio_compra NUMERIC(12,2) DEFAULT 0,
  precio_venta  NUMERIC(12,2) DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bodegas
CREATE TABLE IF NOT EXISTS bodegas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  direccion TEXT
);

-- Existencias por producto y bodega
CREATE TABLE IF NOT EXISTS stock (
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  bodega_id   UUID NOT NULL REFERENCES bodegas(id) ON DELETE CASCADE,
  cantidad NUMERIC(14,3) NOT NULL DEFAULT 0,
  minimo  NUMERIC(14,3) NOT NULL DEFAULT 0,
  maximo  NUMERIC(14,3),
  PRIMARY KEY (producto_id, bodega_id)
);

-- Clientes (Para despachos)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identificacion TEXT UNIQUE,
  nombre TEXT NOT NULL,
  telefono TEXT,
  correo TEXT
);

-- Seguridad
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE  -- 'ADMIN', 'OPERADOR', etc.
);

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  hash_password TEXT NOT NULL,
  rol_id UUID REFERENCES roles(id)
);

-- 4. Movimientos de inventarios
CREATE TABLE IF NOT EXISTS movimientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo tipo_movimiento NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  bodega_id UUID NOT NULL REFERENCES bodegas(id),
  proveedor_id UUID REFERENCES proveedores(id), -- para INGRESO
  cliente_id UUID REFERENCES clientes(id),      -- para DESPACHO
  usuario_id UUID REFERENCES usuarios(id),
  observacion TEXT
);

CREATE TABLE IF NOT EXISTS movimiento_detalles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movimiento_id UUID NOT NULL REFERENCES movimientos(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  costo_unitario NUMERIC(12,2),  -- valorización en ingresos
  precio_unitario NUMERIC(12,2)  -- precio en despachos (opcional)
);

-- 5. Indices
CREATE INDEX IF NOT EXISTS idx_prod_nombre
  ON productos USING gin (to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS idx_mov_fecha ON movimientos (fecha);
CREATE INDEX IF NOT EXISTS idx_mov_tipo_bodega ON movimientos (tipo, bodega_id);

-- 6. Funcion + trigger para mantener stock
CREATE OR REPLACE FUNCTION aplicar_movimiento_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  v_tipo tipo_movimiento;
  v_bodega UUID;
  v_factor INT;
  v_actual NUMERIC(14,3);
  v_prod UUID;
  v_delta NUMERIC(14,3);
BEGIN
  -- Obtener tipo de movimiento y bodega desde la cabecera
  SELECT tipo, bodega_id INTO v_tipo, v_bodega
  FROM movimientos
  WHERE id = COALESCE(NEW.movimiento_id, OLD.movimiento_id);

  -- Determinar factor según el tipo
  IF v_tipo = 'INGRESO' THEN
    v_factor := 1;
  ELSIF v_tipo = 'DESPACHO' THEN
    v_factor := -1;
  ELSE
    v_factor := 1; -- AJUSTE: positivo por defecto
  END IF;

  -- INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.cantidad IS NULL OR NEW.cantidad <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida (INSERT)';
    END IF;

    v_delta := v_factor * NEW.cantidad;
    v_prod  := NEW.producto_id;

    INSERT INTO stock (producto_id, bodega_id, cantidad)
    VALUES (v_prod, v_bodega, v_delta)
    ON CONFLICT (producto_id, bodega_id)
    DO UPDATE SET cantidad = stock.cantidad + EXCLUDED.cantidad;

  -- UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.cantidad IS NULL OR NEW.cantidad <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida (UPDATE)';
    END IF;

    IF NEW.producto_id <> OLD.producto_id THEN
      -- Revertir el efecto del producto viejo
      INSERT INTO stock (producto_id, bodega_id, cantidad)
      VALUES (OLD.producto_id, v_bodega, v_factor * (-OLD.cantidad))
      ON CONFLICT (producto_id, bodega_id)
      DO UPDATE SET cantidad = stock.cantidad + EXCLUDED.cantidad;

      -- Aplicar efecto al nuevo producto
      INSERT INTO stock (producto_id, bodega_id, cantidad)
      VALUES (NEW.producto_id, v_bodega, v_factor * NEW.cantidad)
      ON CONFLICT (producto_id, bodega_id)
      DO UPDATE SET cantidad = stock.cantidad + EXCLUDED.cantidad;

      v_prod := NEW.producto_id;
    ELSE
      -- Mismo producto: calcular delta de cantidad
      v_delta := v_factor * (NEW.cantidad - OLD.cantidad);
      v_prod  := NEW.producto_id;

      IF v_delta <> 0 THEN
        INSERT INTO stock (producto_id, bodega_id, cantidad)
        VALUES (v_prod, v_bodega, v_delta)
        ON CONFLICT (producto_id, bodega_id)
        DO UPDATE SET cantidad = stock.cantidad + EXCLUDED.cantidad;
      END IF;
    END IF;

  -- DELETE
  ELSIF TG_OP = 'DELETE' THEN
    v_prod  := OLD.producto_id;
    v_delta := v_factor * (-OLD.cantidad);

    INSERT INTO stock (producto_id, bodega_id, cantidad)
    VALUES (v_prod, v_bodega, v_delta)
    ON CONFLICT (producto_id, bodega_id)
    DO UPDATE SET cantidad = stock.cantidad + EXCLUDED.cantidad;
  END IF;

  -- Validación: no permitir stock negativo
  SELECT cantidad INTO v_actual
  FROM stock
  WHERE producto_id = v_prod AND bodega_id = v_bodega;

  IF v_actual < 0 THEN
    RAISE EXCEPTION 'Stock negativo para producto % en bodega %', v_prod, v_bodega;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$func$;

-- Triggers por operacion
CREATE TRIGGER trg_aplicar_stock_ins
AFTER INSERT ON movimiento_detalles
FOR EACH ROW
EXECUTE FUNCTION aplicar_movimiento_stock();

CREATE TRIGGER trg_aplicar_stock_upd
AFTER UPDATE OF cantidad, producto_id ON movimiento_detalles
FOR EACH ROW
EXECUTE FUNCTION aplicar_movimiento_stock();

CREATE TRIGGER trg_aplicar_stock_del
AFTER DELETE ON movimiento_detalles
FOR EACH ROW
EXECUTE FUNCTION aplicar_movimiento_stock();

-- 7. Usuario Admin
INSERT INTO roles (nombre) VALUES ('ADMIN')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO usuarios (nombre, email, hash_password, rol_id)
SELECT
  'Admin',
  'admin@casaguflo.local',
  '$2b$10$REEMPLAZA_ESTE_HASH_BCRYPT_POR_UNO_REAL',
  (SELECT id FROM roles WHERE nombre = 'ADMIN')
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@casaguflo.local');