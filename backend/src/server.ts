import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.routes';
import productosRoutes from './routes/productos.routes';
import movimientosRoutes from './routes/movimientos.routes';
import bodegasRoutes from './routes/bodegas.routes';
import proveedoresRoutes from './routes/proveedores.routes';
import clientesRoutes from './routes/clientes.routes';

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
app.use('/productos', productosRoutes);
app.use('/bodegas', bodegasRoutes);
app.use('/proveedores', proveedoresRoutes);
app.use('/movimientos', movimientosRoutes);
app.use('/clientes', clientesRoutes);

// Puerto (usa el del .env o 4000 por defecto)
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Servidor backend corriendo en puerto ${PORT}`);
});
