import { Router } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

// Conexión a la base usando la variable del .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    const result = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.hash_password, r.nombre AS rol
       FROM usuarios u
       LEFT JOIN roles r ON r.id = u.rol_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.hash_password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, rol: user.rol || 'ADMIN' },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '8h' }
    );

    res.json({
      accessToken: token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol || 'ADMIN',
      },
    });
  } catch (err: any) {
    console.error('Error en /auth/login:', err.message || err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
