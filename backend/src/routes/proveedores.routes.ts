import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /proveedores
 * Proveedores activos (sirve para selects y para la pestaña principal)
 */
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, contacto, telefono, correo
       FROM proveedores
       WHERE activo = TRUE
       ORDER BY nombre`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error en GET /proveedores:', err.message || err);
    res.status(500).json({ message: 'Error al obtener proveedores' });
  }
});

/**
 * GET /proveedores/inactivos
 */
router.get('/inactivos', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, contacto, telefono, correo
       FROM proveedores
       WHERE activo = FALSE
       ORDER BY nombre`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error en GET /proveedores/inactivos:', err.message || err);
    res.status(500).json({ message: 'Error al obtener proveedores inactivos' });
  }
});

/**
 * GET /proveedores/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `SELECT id, nombre, contacto, telefono, correo, activo
       FROM proveedores
       WHERE id = $1`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    res.json(r.rows[0]);
  } catch (err: any) {
    console.error('Error en GET /proveedores/:id:', err.message || err);
    res.status(500).json({ message: 'Error al obtener proveedor' });
  }
});

/**
 * POST /proveedores
 */
router.post('/', async (req, res) => {
  try {
    const { nombre, contacto, telefono, correo } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const r = await pool.query(
      `INSERT INTO proveedores (nombre, contacto, telefono, correo, activo)
       VALUES ($1,$2,$3,$4, TRUE)
       RETURNING id, nombre`,
      [nombre, contacto || null, telefono || null, correo || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err: any) {
    console.error('Error en POST /proveedores:', err.message || err);
    res.status(500).json({ message: 'Error al crear proveedor' });
  }
});

/**
 * PUT /proveedores/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, contacto, telefono, correo, activo } = req.body;

    const r = await pool.query(
      `UPDATE proveedores
       SET
         nombre   = COALESCE($1, nombre),
         contacto = COALESCE($2, contacto),
         telefono = COALESCE($3, telefono),
         correo   = COALESCE($4, correo),
         activo   = COALESCE($5, activo)
       WHERE id = $6
       RETURNING id, nombre`,
      [
        nombre ?? null,
        contacto ?? null,
        telefono ?? null,
        correo ?? null,
        typeof activo === 'boolean' ? activo : null,
        id,
      ]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    res.json(r.rows[0]);
  } catch (err: any) {
    console.error('Error en PUT /proveedores/:id:', err.message || err);
    res.status(500).json({ message: 'Error al actualizar proveedor' });
  }
});

/**
 * DELETE /proveedores/:id
 * Baja lógica: activo = FALSE
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE proveedores
       SET activo = FALSE
       WHERE id = $1
       RETURNING id`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    res.json({ message: 'Proveedor desactivado' });
  } catch (err: any) {
    console.error('Error en DELETE /proveedores/:id:', err.message || err);
    res.status(500).json({ message: 'Error al desactivar proveedor' });
  }
});

/**
 * PUT /proveedores/:id/reactivar
 */
router.put('/:id/reactivar', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE proveedores
       SET activo = TRUE
       WHERE id = $1
       RETURNING id, nombre`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    res.json({ message: `Proveedor ${r.rows[0].nombre} reactivado` });
  } catch (err: any) {
    console.error('Error en PUT /proveedores/:id/reactivar:', err.message || err);
    res.status(500).json({ message: 'Error al reactivar proveedor' });
  }
});

router.delete('/:id/hard', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Quitar referencia en movimientos
    await client.query(
      `UPDATE movimientos
       SET proveedor_id = NULL
       WHERE proveedor_id = $1`,
      [id]
    );

    // Eliminar proveedor
    const delRes = await client.query(
      `DELETE FROM proveedores
       WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    if (delRes.rowCount === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    return res.status(204).send();
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error en DELETE /proveedores/:id/hard', err.message || err);
    return res
      .status(500)
      .json({ message: 'Error al eliminar proveedor', detail: err.message });
  } finally {
    client.release();
  }
});

export default router;
