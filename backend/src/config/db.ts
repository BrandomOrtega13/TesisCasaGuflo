import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Esto es para probar la conexión apenas arranque el servidor
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error conectando a Supabase:', err.message);
  } else {
    console.log('🚀 Conexión a Supabase exitosa (SSL Activo)');
  }
});
