import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre FROM bodegas ORDER BY nombre'
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error en GET /bodegas:', err.message || err);
    res.status(500).json({ message: 'Error al obtener bodegas' });
  }
});

export default router;
