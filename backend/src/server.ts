import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.routes';

const app = express();

// Habilitar CORS para el frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: false,
}));

app.use(express.json());

// Ruta básica para probar que la API responde
app.get('/', (_req, res) => {
  res.send('✅ API Casa Guflo funcionando');
});

// Aquí montamos las rutas de autenticación
app.use('/auth', authRoutes);

// Puerto (usa el del .env o 4000 por defecto)
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Servidor backend corriendo en puerto ${PORT}`);
});
