import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import ProductsList from './pages/ProductsList';
import ProductForm from './pages/ProductForm';
import Ingresos from './pages/Ingresos';
import Despachos from './pages/Despachos';
import Movimientos from './pages/Movimientos';
import ProveedoresList from './pages/ProveedoresList';
import ProveedorForm from './pages/ProveedorForm';
import ClientesList from './pages/ClientesList';
import BodegasList from './pages/BodegasList';
import ProductDetail from './pages/ProductDetail';
import CategoriasList from './pages/CategoriasList';
import CategoriaForm from './pages/CategoriaForm';

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
        <Route index element={<Home />} />

        {/* Inventario */}
        <Route path="productos" element={<ProductsList />} />
        <Route path="productos/:id" element={<ProductForm />} />
        <Route path="productos/:id/detalle" element={<ProductDetail />} />

        {/* Categorías */}
        <Route path="categorias" element={<CategoriasList />} />
        <Route path="categorias/:id" element={<CategoriaForm />} />

        {/* Operaciones */}
        <Route path="ingresos" element={<Ingresos />} />
        <Route path="despachos" element={<Despachos />} />
        <Route path="movimientos" element={<Movimientos />} />

        {/* Proveedores */}
        <Route path="proveedores" element={<ProveedoresList />} />
        <Route path="proveedores/:id" element={<ProveedorForm />} />

        {/* Clientes (solo lista, el form es modal) */}
        <Route path="clientes" element={<ClientesList />} />

        {/* Bodegas (solo lista, el form es modal) */}
        <Route path="bodegas" element={<BodegasList />} />

        {/* 404 dentro del layout */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* 404 fuera del layout */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
