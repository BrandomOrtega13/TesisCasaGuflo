import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /clientes
 * Solo activos (para selects y lista principal)
 */
router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, identificacion, nombre, telefono, correo
       FROM clientes
       WHERE activo = TRUE
       ORDER BY nombre`
    );
    res.json(r.rows);
  } catch (err: any) {
    console.error('Error en GET /clientes:', err.message || err);
    res.status(500).json({ message: 'Error al obtener clientes' });
  }
});

/**
 * GET /clientes/inactivos
 */
router.get('/inactivos', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, identificacion, nombre, telefono, correo
       FROM clientes
       WHERE activo = FALSE
       ORDER BY nombre`
    );
    res.json(r.rows);
  } catch (err: any) {
    console.error('Error en GET /clientes/inactivos:', err.message || err);
    res.status(500).json({ message: 'Error al obtener clientes inactivos' });
  }
});

/**
 * GET /clientes/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `SELECT id, identificacion, nombre, telefono, correo, activo
       FROM clientes
       WHERE id = $1`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(r.rows[0]);
  } catch (err: any) {
    console.error('Error en GET /clientes/:id:', err.message || err);
    res.status(500).json({ message: 'Error al obtener cliente' });
  }
});

/**
 * POST /clientes
 */
router.post('/', async (req, res) => {
  try {
    const { identificacion, nombre, telefono, correo } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const r = await pool.query(
      `INSERT INTO clientes (identificacion, nombre, telefono, correo, activo)
       VALUES ($1,$2,$3,$4, TRUE)
       RETURNING id, nombre`,
      [identificacion || null, nombre, telefono || null, correo || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err: any) {
    console.error('Error en POST /clientes:', err.message || err);
    res.status(500).json({ message: 'Error al crear cliente' });
  }
});

/**
 * PUT /clientes/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { identificacion, nombre, telefono, correo, activo } = req.body;

    const r = await pool.query(
      `UPDATE clientes
       SET
         identificacion = COALESCE($1, identificacion),
         nombre         = COALESCE($2, nombre),
         telefono       = COALESCE($3, telefono),
         correo         = COALESCE($4, correo),
         activo         = COALESCE($5, activo)
       WHERE id = $6
       RETURNING id, nombre`,
      [
        identificacion ?? null,
        nombre ?? null,
        telefono ?? null,
        correo ?? null,
        typeof activo === 'boolean' ? activo : null,
        id,
      ]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(r.rows[0]);
  } catch (err: any) {
    console.error('Error en PUT /clientes/:id:', err.message || err);
    res.status(500).json({ message: 'Error al actualizar cliente' });
  }
});

/**
 * DELETE /clientes/:id
 * Baja lógica: activo = FALSE
 * (así no rompemos los movimientos ya registrados)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE clientes
       SET activo = FALSE
       WHERE id = $1
       RETURNING id`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado' });
  } catch (err: any) {
    console.error('Error en DELETE /clientes/:id:', err.message || err);
    res.status(500).json({ message: 'Error al eliminar cliente' });
  }
});

/**
 * PUT /clientes/:id/reactivar
 */
router.put('/:id/reactivar', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE clientes
       SET activo = TRUE
       WHERE id = $1
       RETURNING id, nombre`,
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json({ message: `Cliente ${r.rows[0].nombre} reactivado` });
  } catch (err: any) {
    console.error('Error en PUT /clientes/:id/reactivar:', err.message || err);
    res.status(500).json({ message: 'Error al reactivar cliente' });
  }
});

export default router;
