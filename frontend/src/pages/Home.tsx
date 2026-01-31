// src/pages/Home.tsx
export default function Home() {
  return (
    <div className="home">
      <div className="home-hero">
        <div className="home-card">
          <h1>Bienvenido a Casa Guflo</h1>
          <p>
            Gestiona tus productos, bodegas, proveedores, clientes y movimientos desde un solo lugar.
          </p>

          <div className="home-actions">
            <a className="btn-primary" href="/productos">Ir a Productos</a>
            <a className="btn-secondary" href="/movimientos">Ver Movimientos</a>
          </div>
        </div>
      </div>
    </div>
  );
}
