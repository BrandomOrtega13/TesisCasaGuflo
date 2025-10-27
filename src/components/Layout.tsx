import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Layout() {
  const { user, logout } = useAuthStore();

  return (
    <div style={{ minHeight: '100vh', background:'#f8fafc', color:'#0f172a' }}>
      <header style={{ background:'#fff', boxShadow:'0 1px 0 rgba(0,0,0,.06)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'12px 16px',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link to="/" style={{ fontWeight:700 }}>Casa Guflo</Link>
          <nav style={{ display:'flex', gap:16 }}>
            <NavLink to="/productos">Productos</NavLink>
            <NavLink to="/ingresos">Ingresos</NavLink>
            <NavLink to="/despachos">Despachos</NavLink>
            <NavLink to="/movimientos">Movimientos</NavLink>
          </nav>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {user && <span style={{ fontSize:12 }}>{user.name} · {user.role}</span>}
            <button onClick={logout} style={{ fontSize:12, textDecoration:'underline',
              background:'none', border:'none', cursor:'pointer' }}>
              Salir
            </button>
          </div>
        </div>
      </header>
      <main style={{ maxWidth:1200, margin:'0 auto', padding:16 }}>
        <Outlet />
      </main>
    </div>
  );
}
