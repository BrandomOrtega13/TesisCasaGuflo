import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /bodegas
 * Activas (para selects y para pestaña principal)
 */
router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, nombre, direccion
       FROM bodegas
       WHERE activo = TRUE
       ORDER BY nombre`
    );
    res.json(r.rows);
  } catch (err: any) {
    console.error('Error en GET /bodegas:', err.message || err);
    res.status(500).json({ message: 'Error al obtener bodegas' });
  }
});

/**
 * GET /bodegas/inactivas
 */
router.get('/inactivas', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, nombre, direccion
       FROM bodegas
       WHERE activo = FALSE
       ORDER BY nombre`
    );
    res.json(r.rows);
  } catch (err: any) {
    console.error('Error en GET /bodegas/inactivas:', err.message || err);
    res.status(500).json({ message: 'Error al obtener bodegas inactivas' });
  }
});

/**
 * GET /bodegas/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `SELECT id, nombre, direccion, activo
       FROM bodegas
       WHERE id = $1`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Bodega no encontrada' });
    }
    res.json(r.rows[0]);
  } catch (err: any) {
    console.error('Error en GET /bodegas/:id:', err.message || err);
    res.status(500).json({ message: 'Error al obtener bodega' });
  }
});

/**
 * POST /bodegas
 */
router.post('/', async (req, res) => {
  try {
    const { nombre, direccion } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const r = await pool.query(
      `INSERT INTO bodegas (nombre, direccion, activo)
       VALUES ($1,$2, TRUE)
       RETURNING id, nombre`,
      [nombre, direccion || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err: any) {
    console.error('Error en POST /bodegas:', err.message || err);
    res.status(500).json({ message: 'Error al crear bodega' });
  }
});

/**
 * PUT /bodegas/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, activo } = req.body;

    const r = await pool.query(
      `UPDATE bodegas
       SET
         nombre    = COALESCE($1, nombre),
         direccion = COALESCE($2, direccion),
         activo    = COALESCE($3, activo)
       WHERE id = $4
       RETURNING id, nombre`,
      [
        nombre ?? null,
        direccion ?? null,
        typeof activo === 'boolean' ? activo : null,
        id,
      ]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Bodega no encontrada' });
    }
    res.json(r.rows[0]);
  } catch (err: any) {
    console.error('Error en PUT /bodegas/:id:', err.message || err);
    res.status(500).json({ message: 'Error al actualizar bodega' });
  }
});

/**
 * DELETE /bodegas/:id
 * Baja lógica
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE bodegas
       SET activo = FALSE
       WHERE id = $1
       RETURNING id`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Bodega no encontrada' });
    }
    res.json({ message: 'Bodega desactivada' });
  } catch (err: any) {
    console.error('Error en DELETE /bodegas/:id:', err.message || err);
    res.status(500).json({ message: 'Error al desactivar bodega' });
  }
});

/**
 * PUT /bodegas/:id/reactivar
 */
router.put('/:id/reactivar', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE bodegas
       SET activo = TRUE
       WHERE id = $1
       RETURNING id, nombre`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Bodega no encontrada' });
    }
    res.json({ message: `Bodega ${r.rows[0].nombre} reactivada` });
  } catch (err: any) {
    console.error('Error en PUT /bodegas/:id/reactivar:', err.message || err);
    res.status(500).json({ message: 'Error al reactivar bodega' });
  }
});

router.delete('/:id/hard', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Borrar detalles de movimientos de esa bodega
    await client.query(
      `DELETE FROM movimiento_detalles
       WHERE movimiento_id IN (
         SELECT id FROM movimientos WHERE bodega_id = $1
       )`,
      [id]
    );

    // Borrar movimientos de esa bodega
    await client.query(
      `DELETE FROM movimientos
       WHERE bodega_id = $1`,
      [id]
    );

    // Borrar stock de esa bodega
    await client.query(
      `DELETE FROM stock
       WHERE bodega_id = $1`,
      [id]
    );

    // Finalmente, borrar la bodega
    const delRes = await client.query(
      `DELETE FROM bodegas
       WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    if (delRes.rowCount === 0) {
      return res.status(404).json({ message: 'Bodega no encontrada' });
    }

    return res.status(204).send();
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error en DELETE /bodegas/:id/hard', err.message || err);
    return res
      .status(500)
      .json({ message: 'Error al eliminar bodega', detail: err.message });
  } finally {
    client.release();
  }
});


export default router;
