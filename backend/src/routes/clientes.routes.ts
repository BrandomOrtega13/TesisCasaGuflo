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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Valida cédula ecuatoriana (10 dígitos)
 * - provincia: 01..24
 * - tercer dígito: 0..5 (persona natural)
 * - dígito verificador (módulo 10)
 */
const isValidEcuadorCedula = (cedula: string): boolean => {
  if (!/^\d{10}$/.test(cedula)) return false;

  const prov = Number(cedula.slice(0, 2));
  if (prov < 1 || prov > 24) return false;

  const third = Number(cedula[2]);
  if (third < 0 || third > 5) return false;

  const digits = cedula.split('').map((c) => Number(c));
  const check = digits[9];

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let val = digits[i];
    if (i % 2 === 0) {
      val = val * 2;
      if (val > 9) val -= 9;
    }
    sum += val;
  }
  const mod = sum % 10;
  const verifier = mod === 0 ? 0 : 10 - mod;

  return verifier === check;
};

/**
 * Validación básica RUC persona natural (13 dígitos):
 * - primeros 10 deben ser cédula válida
 * - últimos 3 no pueden ser "000"
 */
const isValidEcuadorRucNatural = (ruc: string): boolean => {
  if (!/^\d{13}$/.test(ruc)) return false;
  const baseCedula = ruc.slice(0, 10);
  const suffix = ruc.slice(10);
  if (!isValidEcuadorCedula(baseCedula)) return false;
  if (suffix === '000') return false;
  return true;
};

/**
 * Normaliza y valida identificación:
 * - SOLO permite 10 (cédula) o 13 (ruc)
 * - 10 => cédula válida
 * - 13 => ruc válido (natural básico)
 */
const normalizeAndValidateIdent = (identificacion: any) => {
  const identDigits = onlyDigits(identificacion);

  if (!identDigits) {
    return { ok: false, ident: identDigits, message: 'La identificación es obligatoria' };
  }

  if (identDigits.length !== 10 && identDigits.length !== 13) {
    return {
      ok: false,
      ident: identDigits,
      message: 'La identificación debe ser una cédula (10 dígitos) o un RUC (13 dígitos)',
    };
  }

  if (identDigits.length === 10) {
    if (!isValidEcuadorCedula(identDigits)) {
      return {
        ok: false,
        ident: identDigits,
        message: 'La cédula ingresada no es válida (revise los dígitos)',
      };
    }
  }

  if (identDigits.length === 13) {
    if (!isValidEcuadorRucNatural(identDigits)) {
      return {
        ok: false,
        ident: identDigits,
        message: 'El RUC ingresado no es válido (revise los dígitos)',
      };
    }
  }

  return { ok: true, ident: identDigits, message: '' };
};

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

    const identCheck = normalizeAndValidateIdent(identificacion);
    if (!identCheck.ok) {
      return res.status(400).json({ message: identCheck.message });
    }

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    // No permitir identificaciones duplicadas
    const exists = await pool.query(
      `SELECT id FROM clientes WHERE identificacion = $1 LIMIT 1`,
      [identCheck.ident]
    );
    if (exists.rowCount && exists.rowCount > 0) {
      return res.status(400).json({ message: 'Ya existe un cliente con esa identificación' });
    }

    const telefonoDigits = onlyDigits(telefono);
    const correoClean = String(correo ?? '').trim();

    if (correoClean) {
      if (!isValidEmailFormat(correoClean)) {
        return res.status(400).json({ message: 'El correo no tiene un formato válido' });
      }
    }

    const r = await pool.query(
      `INSERT INTO clientes (identificacion, nombre, telefono, correo, activo)
       VALUES ($1,$2,$3,$4, TRUE)
       RETURNING id, nombre`,
      [identCheck.ident, String(nombre).trim(), telefonoDigits || null, correoClean || null]
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

    const ident =
      identificacion === undefined ? undefined : normalizeAndValidateIdent(identificacion);

    if (ident !== undefined && !ident.ok) {
      return res.status(400).json({ message: ident.message });
    }

    if (ident !== undefined) {
      // No permitir duplicados en update (distinto id)
      const exists = await pool.query(
        `SELECT id FROM clientes WHERE identificacion = $1 AND id <> $2 LIMIT 1`,
        [ident.ident, id]
      );
      if (exists.rowCount && exists.rowCount > 0) {
        return res.status(400).json({ message: 'Ya existe un cliente con esa identificación' });
      }
    }

    if (nombre !== undefined && !String(nombre).trim()) {
      return res.status(400).json({ message: 'El nombre no puede estar vacío' });
    }

    const telefonoDigits = telefono === undefined ? undefined : onlyDigits(telefono);
    const correoClean = correo === undefined ? undefined : String(correo ?? '').trim();

    if (correoClean !== undefined && correoClean) {
      if (!isValidEmailFormat(correoClean)) {
        return res.status(400).json({ message: 'El correo no tiene un formato válido' });
      }
    }

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
        ident !== undefined ? ident.ident : null,
        nombre !== undefined ? String(nombre).trim() : null,
        telefonoDigits !== undefined ? (telefonoDigits || null) : null,
        correoClean !== undefined ? (correoClean || null) : null,
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

router.delete('/:id/hard', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE movimientos
       SET cliente_id = NULL
       WHERE cliente_id = $1`,
      [id]
    );

    const delRes = await client.query(
      `DELETE FROM clientes
       WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    if (delRes.rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    return res.status(204).send();
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error en DELETE /clientes/:id/hard', err.message || err);
    return res
      .status(500)
      .json({ message: 'Error al eliminar cliente', detail: err.message });
  } finally {
    client.release();
  }
});

export default router;
