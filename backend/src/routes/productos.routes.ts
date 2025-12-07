import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /productos
 * Lista de productos activos con info básica + stock total + precios + unidades_por_caja
 */
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        p.id,
        p.sku,
        p.nombre,
        c.nombre AS categoria,
        COALESCE(pr.nombre, ult_prov.nombre) AS proveedor,
        u.codigo       AS unidad,
        p.precio_venta,
        p.precio_mayorista,
        p.precio_caja,
        p.unidades_por_caja,
        COALESCE(SUM(s.cantidad), 0) AS stock
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
      LEFT JOIN unidades u ON u.id = p.unidad_id
      LEFT JOIN stock s ON s.producto_id = p.id

      -- último proveedor que hizo un INGRESO de este producto
      LEFT JOIN LATERAL (
        SELECT pv.nombre
        FROM movimientos m
        JOIN movimiento_detalles md ON md.movimiento_id = m.id
        JOIN proveedores pv ON pv.id = m.proveedor_id
        WHERE md.producto_id = p.id
          AND m.tipo = 'INGRESO'
        ORDER BY m.fecha DESC
        LIMIT 1
      ) AS ult_prov ON TRUE

      WHERE p.activo = TRUE
      GROUP BY
        p.id,
        c.nombre,
        pr.nombre,
        ult_prov.nombre,
        u.codigo,
        p.precio_venta,
        p.precio_mayorista,
        p.precio_caja,
        p.unidades_por_caja
      ORDER BY p.nombre;
      `
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error en GET /productos:', err.message || err);
    res.status(500).json({ message: 'Error al obtener productos' });
  }
});

/**
 * GET /productos/inactivos
 * Ahora también devuelve unidades_por_caja
 */
router.get('/inactivos', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.id,
         p.sku,
         p.nombre,
         c.nombre AS categoria,
         pr.nombre AS proveedor,
         u.codigo AS unidad,
         p.unidades_por_caja
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

/**
 * PUT /productos/:id/reactivar
 */
router.put('/:id/reactivar', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE productos
       SET activo = TRUE
       WHERE id = $1
       RETURNING id, nombre`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({ message: `Producto ${r.rows[0].nombre} reactivado` });
  } catch (err: any) {
    console.error('Error en PUT /productos/:id/reactivar:', err.message || err);
    res.status(500).json({ message: 'Error al reactivar producto' });
  }
});

/**
 * GET /productos/:id
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const base = await pool.query(
      `
      SELECT
        p.id,
        p.sku,
        p.nombre,
        c.nombre AS categoria,
        COALESCE(pr.nombre, ult_prov.nombre) AS proveedor,
        p.precio_compra,
        p.precio_venta,
        p.precio_mayorista,
        p.precio_caja,
        p.unidades_por_caja,
        COALESCE(SUM(s.cantidad), 0) AS stock_total,
        p.activo
      FROM productos p
      LEFT JOIN categorias  c  ON c.id  = p.categoria_id
      LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
      LEFT JOIN stock       s  ON s.producto_id = p.id

      -- último proveedor que hizo un INGRESO de este producto
      LEFT JOIN LATERAL (
        SELECT pv.nombre
        FROM movimientos m
        JOIN movimiento_detalles md ON md.movimiento_id = m.id
        JOIN proveedores pv ON pv.id = m.proveedor_id
        WHERE md.producto_id = p.id
          AND m.tipo = 'INGRESO'
        ORDER BY m.fecha DESC
        LIMIT 1
      ) AS ult_prov ON TRUE

      WHERE p.id = $1
      GROUP BY
        p.id,
        c.nombre,
        pr.nombre,
        ult_prov.nombre
      `,
      [id]
    );

    if (base.rowCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const producto = base.rows[0];

    // Obtener stock por bodega
    const bodegasRes = await pool.query(
      `
      SELECT 
        b.id,
        b.nombre AS bodega,
        COALESCE(s.cantidad, 0) AS cantidad
      FROM bodegas b
      LEFT JOIN stock s ON s.bodega_id = b.id AND s.producto_id = $1
      ORDER BY b.nombre;
      `,
      [id]
    );

    producto.bodegas = bodegasRes.rows;

    return res.json(producto);
  } catch (err: any) {
    console.error('Error en GET /productos/:id', err.message || err);
    return res.status(500).json({
      message: 'Error al obtener producto',
      detail: err.message,
    });
  }
});

/**
 * POST /productos
 * Validación (D): si precio_caja > 0 => unidades_por_caja > 0 obligatorio
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
      precio_mayorista,
      precio_caja,
      unidades_por_caja,
    } = req.body;

    if (!sku || !nombre) {
      return res
        .status(400)
        .json({ message: 'SKU y nombre son obligatorios' });
    }

    const precioCajaNum = Number(precio_caja || 0);
    const upc = unidades_por_caja ?? null;

    if (precioCajaNum > 0 && (!upc || upc <= 0)) {
      return res.status(400).json({
        message:
          'Si ingresas precio por caja, debes indicar unidades por caja (> 0).',
      });
    }

    const result = await pool.query(
      `INSERT INTO productos 
         (sku, nombre, categoria_id, proveedor_id, unidad_id, 
          precio_compra, precio_venta, precio_mayorista, precio_caja, unidades_por_caja, activo)
       VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, TRUE)
       RETURNING id, sku, nombre`,
      [
        sku,
        nombre,
        categoria_id || null,
        proveedor_id || null,
        unidad_id || null,
        precio_compra || 0,
        precio_venta || 0,
        precio_mayorista || 0,
        precio_caja || 0,
        unidades_por_caja || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'SKU ya existe, use otro' });
    }
    console.error('Error en POST /productos:', err.message || err);
    res.status(500).json({ message: 'Error al crear producto' });
  }
});

/**
 * PUT /productos/:id
 * Validación (D) también aquí: calculamos el valor final antes de guardar.
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    // Traer valores actuales para poder validar combinación precio_caja + unidades_por_caja
    const current = await pool.query(
      `SELECT precio_caja, unidades_por_caja
       FROM productos
       WHERE id = $1`,
      [id]
    );

    if (current.rowCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const actual = current.rows[0];

    const finalPrecioCaja =
      body.precio_caja !== undefined ? body.precio_caja : actual.precio_caja;
    const finalUpc =
      body.unidades_por_caja !== undefined
        ? body.unidades_por_caja
        : actual.unidades_por_caja;

    if (Number(finalPrecioCaja || 0) > 0 && (!finalUpc || finalUpc <= 0)) {
      return res.status(400).json({
        message:
          'Si el producto tiene precio por caja, debe tener unidades por caja (> 0).',
      });
    }

    const result = await pool.query(
      `UPDATE productos
       SET
         sku                = COALESCE($1, sku),
         nombre             = COALESCE($2, nombre),
         categoria_id       = COALESCE($3, categoria_id),
         proveedor_id       = COALESCE($4, proveedor_id),
         unidad_id          = COALESCE($5, unidad_id),
         precio_compra      = COALESCE($6, precio_compra),
         precio_venta       = COALESCE($7, precio_venta),
         precio_mayorista   = COALESCE($8, precio_mayorista),
         precio_caja        = COALESCE($9, precio_caja),
         unidades_por_caja  = COALESCE($10, unidades_por_caja),
         activo             = COALESCE($11, activo)
       WHERE id = $12
       RETURNING id, sku, nombre`,
      [
        body.sku ?? null,
        body.nombre ?? null,
        body.categoria_id ?? null,
        body.proveedor_id ?? null,
        body.unidad_id ?? null,
        body.precio_compra ?? null,
        body.precio_venta ?? null,
        body.precio_mayorista ?? null,
        body.precio_caja ?? null,
        body.unidades_por_caja ?? null,
        typeof body.activo === 'boolean' ? body.activo : null,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'SKU ya existe, use otro' });
    }
    console.error('Error en PUT /productos/:id:', err.message || err);
    res.status(500).json({ message: 'Error al actualizar producto' });
  }
});

/**
 * DELETE /productos/:id
 * Baja lógica: activo = FALSE
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

/**
 * DELETE /productos/:id/hard
 */
router.delete('/:id/hard', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'DELETE FROM movimiento_detalles WHERE producto_id = $1',
      [id]
    );

    await client.query('DELETE FROM stock WHERE producto_id = $1', [id]);

    const delRes = await client.query('DELETE FROM productos WHERE id = $1', [id]);

    await client.query('COMMIT');

    if (delRes.rowCount === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    return res.status(204).send();
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error en DELETE /productos/:id/hard', err.message || err);
    return res
      .status(500)
      .json({ message: 'Error al eliminar producto', detail: err.message });
  } finally {
    client.release();
  }
});