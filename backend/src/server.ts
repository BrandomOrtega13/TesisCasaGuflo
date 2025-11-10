import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('✅ API Casa Guflo funcionando');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});
