import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

// Usa la misma conexión que el resto del backend
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /productos
 * Lista de productos con info básica + stock total (si existe en tabla stock)
*/
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
      p.id,
      p.sku,
      p.nombre,
      c.nombre       AS categoria,
      pr.nombre      AS proveedor,
      u.codigo       AS unidad,
      COALESCE(SUM(s.cantidad), 0) AS stock
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
      LEFT JOIN unidades u ON u.id = p.unidad_id
      LEFT JOIN stock s ON s.producto_id = p.id
      WHERE p.activo = TRUE
      GROUP BY p.id, c.nombre, pr.nombre, u.codigo
      ORDER BY p.nombre`
    );
    
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error en GET /productos:', err.message || err);
    res.status(500).json({ message: 'Error al obtener productos' });
  }
});

// Listar productos inactivos
router.get('/inactivos', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
      p.id,
      p.sku,
      p.nombre,
      c.nombre AS categoria,
      pr.nombre AS proveedor,
      u.codigo AS unidad
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
      LEFT JOIN unidades u ON u.id = p.unidad_id
      WHERE p.activo = FALSE
      ORDER BY p.nombre`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error en GET /productos/inactivos:', err.message || err);
    res.status(500).json({ message: 'Error al obtener productos inactivos' });
  }
});

// Reactivar producto
router.put('/:id/reactivar', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE productos
       SET activo = TRUE
       WHERE id = $1
       RETURNING id, nombre`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({ message: `Producto ${result.rows[0].nombre} reactivado` });
  } catch (err: any) {
    console.error('Error en PUT /productos/:id/reactivar:', err.message || err);
    res.status(500).json({ message: 'Error al reactivar producto' });
  }
});

/**
 * GET /productos/:id
 * Detalle de un producto (para editar)
*/
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         id,
         sku,
         nombre,
         categoria_id,
         proveedor_id,
         unidad_id,
         precio_compra,
         precio_venta,
         activo
       FROM productos
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error en GET /productos/:id:', err.message || err);
    res.status(500).json({ message: 'Error al obtener producto' });
  }
});

/**
 * POST /productos
 * Crear producto nuevo
 */
router.post('/', async (req, res) => {
  try {
    const {
      sku,
      nombre,
      categoria_id,
      proveedor_id,
      unidad_id,
      precio_compra,
      precio_venta,
    } = req.body;

    if (!sku || !nombre) {
      return res
        .status(400)
        .json({ message: 'SKU y nombre son obligatorios' });
    }

    const result = await pool.query(
      `INSERT INTO productos 
         (sku, nombre, categoria_id, proveedor_id, unidad_id, 
          precio_compra, precio_venta, activo)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING id, sku, nombre`,
      [
        sku,
        nombre,
        categoria_id || null,
        proveedor_id || null,
        unidad_id || null,
        precio_compra || 0,
        precio_venta || 0,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    // 23505 = unique_violation (por SKU duplicado)
    if (err.code === '23505') {
      return res
        .status(400)
        .json({ message: 'SKU ya existe, use otro' });
    }
    console.error('Error en POST /productos:', err.message || err);
    res.status(500).json({ message: 'Error al crear producto' });
  }
});

/**
 * PUT /productos/:id
 * Actualizar producto
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sku,
      nombre,
      categoria_id,
      proveedor_id,
      unidad_id,
      precio_compra,
      precio_venta,
      activo,
    } = req.body;

    const result = await pool.query(
      `UPDATE productos
       SET
         sku            = COALESCE($1, sku),
         nombre         = COALESCE($2, nombre),
         categoria_id   = COALESCE($3, categoria_id),
         proveedor_id   = COALESCE($4, proveedor_id),
         unidad_id      = COALESCE($5, unidad_id),
         precio_compra  = COALESCE($6, precio_compra),
         precio_venta   = COALESCE($7, precio_venta),
         activo         = COALESCE($8, activo)
       WHERE id = $9
       RETURNING id, sku, nombre`,
      [
        sku || null,
        nombre || null,
        categoria_id || null,
        proveedor_id || null,
        unidad_id || null,
        precio_compra ?? null,
        precio_venta ?? null,
        typeof activo === 'boolean' ? activo : null,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res
        .status(400)
        .json({ message: 'SKU ya existe, use otro' });
    }
    console.error('Error en PUT /productos/:id:', err.message || err);
    res.status(500).json({ message: 'Error al actualizar producto' });
  }
});

/**
 * DELETE /productos/:id
 * (opcional) baja lógica: marcar activo = FALSE
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE productos
       SET activo = FALSE
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto desactivado' });
  } catch (err: any) {
    console.error('Error en DELETE /productos/:id:', err.message || err);
    res.status(500).json({ message: 'Error al eliminar producto' });
  }
});

export default router;