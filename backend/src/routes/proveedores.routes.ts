import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ======================
// Helpers
// ======================

// Permite: + al inicio (opcional) + números + espacios + guiones + paréntesis
const normalizePhone = (raw: any) => {
  const s = String(raw ?? '').trim();
  const cleaned = s.replace(/[^\d+\s()-]/g, '');
  const plusFixed = cleaned.replace(/\+/g, (_m, idx) => (idx === 0 ? '+' : ''));
  return plusFixed;
};

const digitsCount = (raw: any) => String(raw ?? '').replace(/\D/g, '').trim().length;

/**
 * GET /proveedores
 * Proveedores activos
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

    // ===== VALIDACIONES =====
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const contactoClean = normalizePhone(contacto);
    if (!contactoClean || digitsCount(contactoClean) < 10) {
      return res.status(400).json({
        message: 'El contacto celular es obligatorio y debe tener mínimo 10 dígitos',
      });
    }

    const telefonoClean = normalizePhone(telefono);
    if (telefonoClean && digitsCount(telefonoClean) > 0 && digitsCount(telefonoClean) < 9) {
      return res.status(400).json({
        message: 'El teléfono local debe tener mínimo 9 dígitos (o dejarlo vacío)',
      });
    }

    // correo: SE ACEPTA SIN VALIDAR (puede venir vacío o cualquier string)
    const correoClean = String(correo ?? '').trim();

    // ===== INSERT =====
    const r = await pool.query(
      `INSERT INTO proveedores (nombre, contacto, telefono, correo, activo)
       VALUES ($1,$2,$3,$4, TRUE)
       RETURNING id, nombre`,
      [
        String(nombre).trim(),
        contactoClean,
        telefonoClean || null,
        correoClean || null,
      ]
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

    // ===== VALIDACIONES =====
    if (nombre !== undefined && !String(nombre).trim()) {
      return res.status(400).json({ message: 'El nombre no puede estar vacío' });
    }

    // contacto obligatorio (mínimo 10 dígitos) si viene en el payload
    const contactoClean = contacto === undefined ? undefined : normalizePhone(contacto);

    if (contactoClean !== undefined) {
      if (!contactoClean || digitsCount(contactoClean) < 10) {
        return res.status(400).json({
          message: 'El contacto celular es obligatorio y debe tener mínimo 10 dígitos',
        });
      }
    }

    const telefonoClean = telefono === undefined ? undefined : normalizePhone(telefono);

    if (telefonoClean !== undefined) {
      if (telefonoClean && digitsCount(telefonoClean) > 0 && digitsCount(telefonoClean) < 9) {
        return res.status(400).json({
          message: 'El teléfono local debe tener mínimo 9 dígitos (o dejarlo vacío)',
        });
      }
    }

    // correo: SIN VALIDAR (si viene vacío => null)
    const correoClean = correo === undefined ? undefined : String(correo ?? '').trim();

    // ===== UPDATE =====
    // FIX: permitir borrar telefono/correo cuando llegan como "" (o null) en el PUT
    const telefonoProvided = telefono !== undefined;
    const correoProvided = correo !== undefined;

    const r = await pool.query(
      `UPDATE proveedores
       SET
         nombre   = COALESCE($1, nombre),
         contacto = COALESCE($2, contacto),

         -- si enviaron "telefono" en el payload:
         --   - "" -> NULL (borra)
         --   - "023..." -> guarda
         -- si NO enviaron telefono -> mantiene lo actual
         telefono = CASE
                    WHEN $3 THEN $4
                    ELSE telefono
                  END,

         -- igual para correo
         correo   = CASE
                    WHEN $5 THEN $6
                    ELSE correo
                  END,

         activo   = COALESCE($7, activo)
       WHERE id = $8
       RETURNING id, nombre, contacto, telefono, correo`,
      [
        nombre !== undefined ? String(nombre).trim() : null,
        contactoClean !== undefined ? contactoClean : null,

        // telefono
        telefonoProvided,                         // $3
        telefonoClean ? telefonoClean : null,     // $4  (si "" => null)

        // correo
        correoProvided,                           // $5
        correoClean ? correoClean : null,         // $6  (si "" => null)

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
