// src/App.tsx
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

import ProductsList from './pages/ProductsList';
import ProductForm from './pages/ProductForm';
import Ingresos from './pages/Ingresos';
import Despachos from './pages/Despachos';
import Movimientos from './pages/Movimientos';

function NotFound() {
  return <div style={{ padding: 16 }}>Página no encontrada</div>;
}

export default function App() {
  return (
    <Routes>
      {/* público */}
      <Route path="/login" element={<Login />} />

      {/* protegido */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<div>Bienvenido a Casa Guflo</div>} />

        {/* Inventario */}
        <Route path="productos" element={<ProductsList />} />
        <Route path="productos/:id" element={<ProductForm />} />

        {/* Operaciones */}
        <Route path="ingresos" element={<Ingresos />} />
        <Route path="despachos" element={<Despachos />} />
        <Route path="movimientos" element={<Movimientos />} />

        {/* 404 dentro del layout */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* 404 fuera del layout */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
