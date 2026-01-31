import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useMemo, useState } from 'react';
import logo from '../assets/logo.svg';

function Icon({
  name,
  className,
}: {
  name:
    | 'box'
    | 'tag'
    | 'arrowDown'
    | 'arrowUp'
    | 'chart'
    | 'truck'
    | 'users'
    | 'home'
    | 'pin'
    | 'pinOff'
    | 'power'
    | 'menu'
    | 'close';
  className?: string;
}) {
  const svg = useMemo(() => {
    switch (name) {
      case 'box':
        return (
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Zm-10 5.2-6-3.43V9.8l6 3.43Zm0-9.28L5.2 8.57 11 5.14l5.8 3.43ZM19 17.77l-6 3.43V13.23l6-3.43Z" />
        );
      case 'tag':
        return (
          <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59A2 2 0 0 0 3.83 11l9.59 9.59a2 2 0 0 0 2.83 0l4.34-4.34a2 2 0 0 0 0-2.83ZM7 7a1 1 0 1 1 1 1 1 1 0 0 1-1-1Z" />
        );
      case 'arrowDown':
        return <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />;
      case 'arrowUp':
        return <path d="M12 21V9m0 0 4 4m-4-4-4 4M5 3h14" />;
      case 'chart':
        return <path d="M4 19V5m0 14h16M8 17v-6m4 6V7m4 10v-3" />;
      case 'truck':
        return (
          <path d="M3 17V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v11M3 17h2m16 0h-2M5 17a2 2 0 1 0 4 0m10 0a2 2 0 1 0 4 0M16 9h4l1 2v6h-5V9Z" />
        );
      case 'users':
        return (
          <path d="M17 21v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M16 3.13a4 4 0 0 1 0 7.75M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
        );
      case 'home':
        return <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5Z" />;
      case 'pin':
        return <path d="M14 2 10 6v5L8 13v2h8v-2l-2-2V6l4-4-4 0ZM12 15v7" />;
      case 'pinOff':
        return <path d="M2 2l20 20M14 2 10 6v5l-2 2v2h8v-2l-2-2V6l4-4-4 0ZM12 15v7" />;
      case 'power':
        return <path d="M12 2v10M6.2 4.2a10 10 0 1 0 11.6 0" />;
      case 'menu':
        return <path d="M4 6h16M4 12h16M4 18h16" />;
      case 'close':
        return <path d="M18 6 6 18M6 6l12 12" />;
      default:
        return null;
    }
  }, [name]);

  const isStroke =
    name === 'arrowDown' ||
    name === 'arrowUp' ||
    name === 'chart' ||
    name === 'truck' ||
    name === 'users' ||
    name === 'home' ||
    name === 'pin' ||
    name === 'pinOff' ||
    name === 'power' ||
    name === 'menu' ||
    name === 'close';

  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill={isStroke ? 'none' : 'currentColor'}
      stroke={isStroke ? 'currentColor' : 'none'}
      strokeWidth={isStroke ? 2 : 0}
      strokeLinecap={isStroke ? 'round' : undefined}
      strokeLinejoin={isStroke ? 'round' : undefined}
    >
      {svg}
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(true);
  const [pinned, setPinned] = useState(false);

  // ✅ SOLO para móvil/tablet: drawer abierto/cerrado
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const togglePinned = () => {
    setPinned((prev) => {
      const next = !prev;
      setCollapsed(!next);
      return next;
    });
  };

  const onSidebarEnter = () => {
    if (!pinned) setCollapsed(false);
  };

  const onSidebarLeave = () => {
    if (!pinned) setCollapsed(true);
  };

  const closeMobile = () => setMobileOpen(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `sidebar-link ${isActive ? 'active' : ''}`;

  return (
    <div
      className={`app-shell ${collapsed ? 'is-collapsed' : ''} ${
        mobileOpen ? 'is-mobile-open' : ''
      }`}
    >
      {/* Overlay móvil */}
      <button
        type="button"
        className="sidebar-overlay"
        aria-label="Cerrar menú"
        onClick={closeMobile}
      />

      <aside
        className="sidebar"
        onMouseEnter={onSidebarEnter}
        onMouseLeave={onSidebarLeave}
      >
        <div className="sidebar-top">
          <Link
            to="/"
            className="sidebar-brand"
            onClick={() => {
              if (mobileOpen) closeMobile();
            }}
          >
            <img src={logo} alt="Casa Guflo" className="sidebar-brand-logo" />
          </Link>

          {/* Desktop: pin (solo cuando está abierto) */}
          {!collapsed && (
            <button
              type="button"
              className={`sidebar-pin ${pinned ? 'is-pinned' : ''}`}
              onClick={togglePinned}
              title={pinned ? 'Desfijar menú' : 'Fijar menú'}
              aria-label={pinned ? 'Desfijar menú' : 'Fijar menú'}
            >
              <Icon name={pinned ? 'pinOff' : 'pin'} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/productos" className={linkClass} onClick={closeMobile}>
            <span className="icon">
              <Icon name="box" />
            </span>
            <span className="label">Productos</span>
          </NavLink>

          <NavLink to="/categorias" className={linkClass} onClick={closeMobile}>
            <span className="icon">
              <Icon name="tag" />
            </span>
            <span className="label">Categorías</span>
          </NavLink>

          <NavLink to="/ingresos" className={linkClass} onClick={closeMobile}>
            <span className="icon">
              <Icon name="arrowDown" />
            </span>
            <span className="label">Ingresos</span>
          </NavLink>

          <NavLink to="/despachos" className={linkClass} onClick={closeMobile}>
            <span className="icon">
              <Icon name="arrowUp" />
            </span>
            <span className="label">Despachos</span>
          </NavLink>

          <NavLink to="/movimientos" className={linkClass} onClick={closeMobile}>
            <span className="icon">
              <Icon name="chart" />
            </span>
            <span className="label">Movimientos</span>
          </NavLink>

          <NavLink to="/proveedores" className={linkClass} onClick={closeMobile}>
            <span className="icon">
              <Icon name="truck" />
            </span>
            <span className="label">Proveedores</span>
          </NavLink>

          <NavLink to="/clientes" className={linkClass} onClick={closeMobile}>
            <span className="icon">
              <Icon name="users" />
            </span>
            <span className="label">Clientes</span>
          </NavLink>

          <NavLink to="/bodegas" className={linkClass} onClick={closeMobile}>
            <span className="icon">
              <Icon name="home" />
            </span>
            <span className="label">Bodegas</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              {user.nombre} · {user.rol}
            </div>
          )}

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            title="Salir"
          >
            {collapsed ? <Icon name="power" /> : 'Salir'}
          </button>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          {/* ✅ Botón móvil (drawer) */}
          <button
            type="button"
            className="topbar-menu"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Icon name={mobileOpen ? 'close' : 'menu'} />
          </button>

          <div className="topbar-title">Panel</div>
          {user && <div className="topbar-user">{user.nombre} · {user.rol}</div>}
        </header>

        <main className="content-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
