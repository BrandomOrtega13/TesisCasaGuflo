import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

type Producto = {
  id: string;
  sku: string;
  nombre: string;
  categoria: string | null;
  proveedor: string | null;
  unidad: string | null;
  stock?: number;
};

export default function ProductsList() {
  const [items, setItems] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setMsg(null);
      const url = mostrarInactivos
        ? '/productos/inactivos'
        : '/productos';
      const res = await api.get(url);
      setItems(res.data);
    } catch (err) {
      console.error('Error cargando productos', err);
      setMsg('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarInactivos]);

  const desactivar = async (id: string) => {
    if (!window.confirm('¿Desactivar este producto?')) return;
    try {
      await api.delete(`/productos/${id}`);
      setMsg('Producto desactivado');
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al desactivar producto');
    }
  };

  const reactivar = async (id: string) => {
    try {
      await api.put(`/productos/${id}/reactivar`);
      setMsg('Producto reactivado');
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al reactivar producto');
    }
  };

  if (loading) return <p>Cargando productos...</p>;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0 }}>Productos</h2>
          <button
            onClick={() => setMostrarInactivos((v) => !v)}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {mostrarInactivos ? 'Ver activos' : 'Ver inactivos'}
          </button>
        </div>

        <Link
          to="/productos/nuevo"
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: '#000',
            color: '#fff',
            fontSize: 14,
          }}
        >
          Nuevo producto
        </Link>
      </div>

      {msg && (
        <p
          style={{
            fontSize: 12,
            color: msg.includes('Error') ? '#dc2626' : '#16a34a',
            marginBottom: 8,
          }}
        >
          {msg}
        </p>
      )}

      {items.length === 0 ? (
        <p>
          {mostrarInactivos
            ? 'No hay productos inactivos.'
            : 'No hay productos activos.'}
        </p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: '#fff',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <thead>
            <tr>
              <th style={th}>SKU</th>
              <th style={th}>Nombre</th>
              <th style={th}>Categoría</th>
              <th style={th}>Proveedor</th>
              <th style={th}>Unidad</th>
              <th style={th}>Stock</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td style={td}>{p.sku}</td>
                <td style={td}>
                  {/* Solo permitimos editar cuando vemos activos */}
                  {mostrarInactivos ? (
                    p.nombre
                  ) : (
                    <Link to={`/productos/${p.id}`}>{p.nombre}</Link>
                  )}
                </td>
                <td style={td}>{p.categoria || '-'}</td>
                <td style={td}>{p.proveedor || '-'}</td>
                <td style={td}>{p.unidad || '-'}</td>
                <td style={td}>{p.stock ?? 0}</td>
                <td style={td}>
                  {mostrarInactivos ? (
                    <button
                      onClick={() => reactivar(p.id)}
                      style={btnLink('#16a34a')}
                    >
                      Reactivar
                    </button>
                  ) : (
                    <>
                      <Link
                        to={`/productos/${p.id}`}
                        style={{
                          marginRight: 8,
                          fontSize: 12,
                          textDecoration: 'underline',
                        }}
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => desactivar(p.id)}
                        style={btnLink('#dc2626')}
                      >
                        Desactivar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5e7eb',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 13,
};

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #f1f5f9',
  fontSize: 13,
};

const btnLink = (color: string): React.CSSProperties => ({
  fontSize: 12,
  color,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
});
