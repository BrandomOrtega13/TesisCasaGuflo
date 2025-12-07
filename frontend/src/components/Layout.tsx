import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout-container">
      <header className="layout-header">
        <div className="layout-header-inner">
          <Link to="/" className="layout-logo">
            Casa Guflo
          </Link>

          <nav className="layout-nav">
            <NavLink to="/productos">Productos</NavLink>
            <NavLink to="/categorias">Categorías</NavLink>
            <NavLink to="/ingresos">Ingresos</NavLink>
            <NavLink to="/despachos">Despachos</NavLink>
            <NavLink to="/movimientos">Movimientos</NavLink>
            <NavLink to="/proveedores">Proveedores</NavLink>
            <NavLink to="/clientes">Clientes</NavLink>
            <NavLink to="/bodegas">Bodegas</NavLink>
          </nav>

          <div className="layout-user-area">
            {user && (
              <span className="layout-user-info">
                {user.nombre} · {user.rol}
              </span>
            )}
            <button onClick={handleLogout} className="layout-logout-btn">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
