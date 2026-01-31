import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ======================
// Helpers
// ======================
const onlyDigits = (s: any) => String(s ?? '').replace(/\D/g, '').trim();

const isValidEmailFormat = (email: string) => {
  // formato básico suficiente para backend
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Validación por API (opcional)
 * ZeroBounce Email Validation
 * ENV: ZEROBOUNCE_API_KEY
 *
 * Si no existe la key => no bloquea (solo valida formato).
 * docs: https://zerobounce.net/docs/email-validation-api-quickstart/
 */
const validateEmailByAPI = async (email: string): Promise<boolean> => {
  try {
    const key = process.env.ZEROBOUNCE_API_KEY;
    if (!key) return true;

    const url = `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(
      key
    )}&email=${encodeURIComponent(email)}`;

    const resp = await fetch(url);
    if (!resp.ok) return true; // si falla, no bloquear

    const data: any = await resp.json();
    const status = String(data?.status ?? '').toLowerCase();

    // status: valid | invalid | catch-all | unknown | spamtrap | abuse | do_not_mail
    if (status === 'valid') return true;

    // todo lo demás lo consideramos "no válido" para tu caso
    return false;
  } catch {
    return true;
  }
};

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

    // ===== VALIDACIONES =====
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const contactoDigits = onlyDigits(contacto);
    if (!contactoDigits || contactoDigits.length < 10) {
      return res.status(400).json({
        message: 'El contacto celular es obligatorio y debe tener mínimo 10 dígitos',
      });
    }

    const telefonoDigits = onlyDigits(telefono);
    if (telefonoDigits && telefonoDigits.length > 0 && telefonoDigits.length < 9) {
      return res.status(400).json({
        message: 'El teléfono local debe tener mínimo 9 dígitos (o dejarlo vacío)',
      });
    }

    const correoClean = String(correo ?? '').trim();
    if (correoClean) {
      if (!isValidEmailFormat(correoClean)) {
        return res.status(400).json({ message: 'El correo no tiene un formato válido' });
      }

      const ok = await validateEmailByAPI(correoClean);
      if (!ok) {
        return res.status(400).json({ message: 'El correo no existe o no es válido' });
      }
    }

    // ===== INSERT =====
    const r = await pool.query(
      `INSERT INTO proveedores (nombre, contacto, telefono, correo, activo)
       VALUES ($1,$2,$3,$4, TRUE)
       RETURNING id, nombre`,
      [
        String(nombre).trim(),
        contactoDigits,
        telefonoDigits || null,
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

    // contacto obligatorio en tu proyecto (mínimo 10)
    // si viene, validarlo
    const contactoDigits =
      contacto === undefined ? undefined : onlyDigits(contacto);

    if (contactoDigits !== undefined) {
      if (!contactoDigits || contactoDigits.length < 10) {
        return res.status(400).json({
          message: 'El contacto celular es obligatorio y debe tener mínimo 10 dígitos',
        });
      }
    }

    const telefonoDigits =
      telefono === undefined ? undefined : onlyDigits(telefono);

    if (telefonoDigits !== undefined) {
      if (telefonoDigits && telefonoDigits.length > 0 && telefonoDigits.length < 9) {
        return res.status(400).json({
          message: 'El teléfono local debe tener mínimo 9 dígitos (o dejarlo vacío)',
        });
      }
    }

    const correoClean = correo === undefined ? undefined : String(correo ?? '').trim();

    if (correoClean !== undefined && correoClean) {
      if (!isValidEmailFormat(correoClean)) {
        return res.status(400).json({ message: 'El correo no tiene un formato válido' });
      }

      const ok = await validateEmailByAPI(correoClean);
      if (!ok) {
        return res.status(400).json({ message: 'El correo no existe o no es válido' });
      }
    }

    // ===== UPDATE =====
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
        nombre !== undefined ? String(nombre).trim() : null,
        contactoDigits !== undefined ? contactoDigits : null,
        telefonoDigits !== undefined ? (telefonoDigits || null) : null,
        correoClean !== undefined ? (correoClean || null) : null,
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
