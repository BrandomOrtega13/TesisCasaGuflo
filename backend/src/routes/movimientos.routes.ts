import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /movimientos/ingresos
 * ✅ Ahora permite bodega por línea:
 * - Si hay varias bodegas en los detalles, crea 1 movimiento por bodega.
 * - Mantiene compatibilidad con bodega_id en cabecera (fallback).
 */
router.post('/ingresos', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      bodega_id, // fallback opcional
      proveedor_id,
      usuario_id,
      fecha,
      observacion,
      detalles,
    } = req.body;

    if (!Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({
        message: 'al menos un detalle es obligatorio',
      });
    }

    // Normaliza + valida detalles
    const limpios = detalles
      .filter((d: any) => d?.producto_id && Number(d?.cantidad) > 0)
      .map((d: any) => ({
        producto_id: d.producto_id,
        cantidad: Number(d.cantidad),
        costo_unitario: d.costo_unitario ?? null,
        bodega_id: d.bodega_id || bodega_id || null, // ✅ por línea o fallback
      }));

    if (limpios.length === 0) {
      return res.status(400).json({ message: 'Detalles inválidos en ingreso' });
    }

    if (limpios.some((d: any) => !d.bodega_id)) {
      return res.status(400).json({
        message: 'Cada detalle debe incluir bodega_id (o enviar bodega_id en cabecera)',
      });
    }

    await client.query('BEGIN');

    // Agrupa por bodega para crear 1 movimiento por bodega
    const grupos = new Map<string, any[]>();
    for (const d of limpios) {
      const key = String(d.bodega_id);
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(d);
    }

    const ids: string[] = [];

    for (const [bodegaLineaId, items] of grupos.entries()) {
      const movRes = await client.query(
        `INSERT INTO movimientos
           (tipo, fecha, bodega_id, proveedor_id, usuario_id, observacion)
         VALUES
           ('INGRESO',
            COALESCE($1::timestamptz, now()),
            $2, $3, $4, $5)
         RETURNING id`,
        [
          fecha || null,
          bodegaLineaId,
          proveedor_id || null,
          usuario_id || null,
          observacion || null,
        ]
      );

      const movimientoId = movRes.rows[0].id;
      ids.push(movimientoId);

      for (const d of items) {
        await client.query(
          `INSERT INTO movimiento_detalles
             (movimiento_id, producto_id, cantidad, costo_unitario)
           VALUES ($1, $2, $3, $4)`,
          [movimientoId, d.producto_id, d.cantidad, d.costo_unitario]
        );
        // Trigger suma stock
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({
      ids,
      message: grupos.size > 1
        ? 'Ingresos registrados por bodega'
        : 'Ingreso registrado',
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error en POST /movimientos/ingresos:', err.message || err);
    return res.status(500).json({ message: 'Error al registrar ingreso' });
  } finally {
    client.release();
  }
});

/**
 * POST /movimientos/despachos
 * Maneja precio_tipo y motivo_descuento
 */
router.post('/despachos', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      bodega_id,
      cliente_id,
      usuario_id,
      fecha,
      observacion,
      detalles,
    } = req.body;

    if (!bodega_id || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({
        message: 'bodega_id y al menos un detalle son obligatorios',
      });
    }

    await client.query('BEGIN');

    const movRes = await client.query(
      `INSERT INTO movimientos
         (tipo, fecha, bodega_id, cliente_id, usuario_id, observacion)
       VALUES
         ('DESPACHO',
          COALESCE($1::timestamptz, now()),
          $2, $3, $4, $5)
       RETURNING id`,
      [
        fecha || null,
        bodega_id,
        cliente_id || null,
        usuario_id || null,
        observacion || null,
      ]
    );

    const movimientoId = movRes.rows[0].id;

    for (const d of detalles) {
      if (!d.producto_id || !d.cantidad || d.cantidad <= 0) {
        throw new Error('Detalle inválido en despacho');
      }

      await client.query(
        `INSERT INTO movimiento_detalles
           (movimiento_id, producto_id, cantidad, precio_unitario, precio_tipo, motivo_descuento)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          movimientoId,
          d.producto_id,
          d.cantidad,
          d.precio_unitario || null,
          d.precio_tipo || null,          // 'NORMAL' | 'MAYORISTA' | 'CAJA' | 'DESCUENTO'
          d.motivo_descuento || null,
        ]
      );
      // Trigger resta stock; si negativo, error y ROLLBACK
    }

    await client.query('COMMIT');
    res.status(201).json({ id: movimientoId, message: 'Despacho registrado' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error en POST /movimientos/despachos:', err.message || err);
    const msg = String(err.message || '');
    if (msg.includes('Stock negativo')) {
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: 'Error al registrar despacho' });
  } finally {
    client.release();
  }
});

/**
 * GET /movimientos
 */
router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;

    const params: any[] = [];
    const where: string[] = [];

    if (tipo) {
      params.push(tipo);
      where.push(`m.tipo = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         m.id,
         m.fecha,
         m.tipo,
         b.nombre  AS bodega,
         pr.nombre AS proveedor,
         cl.nombre AS cliente,
         u.nombre  AS usuario,
         m.observacion,
         d.producto_id,
         COALESCE(p.nombre, d.producto_nombre) AS producto,
         d.cantidad,
         d.costo_unitario,
         d.precio_unitario,
         d.precio_tipo,
         d.motivo_descuento
       FROM movimientos m
       INNER JOIN bodegas b ON b.id = m.bodega_id
       LEFT JOIN proveedores pr ON pr.id = m.proveedor_id
       LEFT JOIN clientes cl ON cl.id = m.cliente_id
       LEFT JOIN usuarios u ON u.id = m.usuario_id
       INNER JOIN movimiento_detalles d ON d.movimiento_id = m.id
       LEFT JOIN productos p ON p.id = d.producto_id
       ${whereSql}
       ORDER BY m.fecha DESC, m.id DESC`,
      params
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error en GET /movimientos:', err.message || err);
    res.status(500).json({ message: 'Error al obtener movimientos' });
  }
});

export default router;
