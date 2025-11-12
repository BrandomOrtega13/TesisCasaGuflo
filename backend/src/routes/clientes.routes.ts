import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre FROM clientes ORDER BY nombre'
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error en GET /clientes:', err.message || err);
    res.status(500).json({ message: 'Error al obtener clientes' });
  }
});

export default router;
