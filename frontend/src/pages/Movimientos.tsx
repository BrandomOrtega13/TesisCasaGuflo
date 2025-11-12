import { useEffect, useState } from 'react';
import api from '../lib/api';

type Movimiento = {
  id: string;
  fecha: string;
  tipo: 'INGRESO' | 'DESPACHO' | 'AJUSTE';
  bodega: string;
  proveedor: string | null;
  cliente: string | null;
  usuario: string | null;
  observacion: string | null;
  producto: string;
  cantidad: number;
  costo_unitario: number | null;
  precio_unitario: number | null;
};

export default function Movimientos() {
  const [items, setItems] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/movimientos');
        setItems(res.data);
      } catch (err) {
        console.error('Error cargando movimientos', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p>Cargando movimientos...</p>;

  if (items.length === 0) return <p>No hay movimientos registrados.</p>;

  return (
    <div>
      <h2>Movimientos</h2>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: 16,
          background: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Bodega</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Proveedor/Cliente</th>
            <th>Usuario</th>
            <th>Obs.</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={`${m.id}-${m.producto}-${m.cantidad}-${m.fecha}`}>
              <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
                {new Date(m.fecha).toLocaleString()}
              </td>
              <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
                {m.tipo}
              </td>
              <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
                {m.bodega}
              </td>
              <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
                {m.producto}
              </td>
              <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
                {m.cantidad}
              </td>
              <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
                {m.proveedor || m.cliente || '-'}
              </td>
              <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
                {m.usuario || '-'}
              </td>
              <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
                {m.observacion || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

