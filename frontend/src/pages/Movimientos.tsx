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

  const [search, setSearch] = useState('');
  const [desde, setDesde] = useState(''); // yyyy-mm-dd
  const [hasta, setHasta] = useState(''); // yyyy-mm-dd

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/movimientos');
        setItems(res.data || []);
      } catch (err) {
        console.error('Error cargando movimientos', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p className="list-message">Cargando movimientos...</p>;
  }

  if (items.length === 0) {
    return <p className="list-message">No hay movimientos registrados.</p>;
  }

  // ==== función auxiliar: convierte la fecha del movimiento a YYYY-MM-DD local ====
  const toDateKey = (value: string): string => {
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`; // mismo formato que el input type="date"
  };

  const term = search.trim().toLowerCase();

  const filtered = items.filter((m) => {
    const dateKey = toDateKey(m.fecha); // ej: "2025-12-06"

    // filtro por fecha (INCLUYENDO desde y hasta)
    if (desde && dateKey < desde) return false;
    if (hasta && dateKey > hasta) return false;

    // filtro por texto
    if (!term) return true;

    const haystack = [
      m.producto,
      m.bodega,
      m.proveedor ?? '',
      m.cliente ?? '',
      m.tipo,
      m.observacion ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(term);
  });

  return (
    <div>
      {/* Cabecera con título + filtros */}
      <div className="page-header">
        <h2 className="page-header-title">Movimientos</h2>
        <div className="page-header-actions">
          <input
            placeholder="Buscar por producto, bodega, prov..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="search-input"
          />
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-header-cell">Fecha</th>
              <th className="table-header-cell">Tipo</th>
              <th className="table-header-cell">Bodega</th>
              <th className="table-header-cell">Producto</th>
              <th className="table-header-cell">Cantidad</th>
              <th className="table-header-cell">Proveedor/Cliente</th>
              <th className="table-header-cell">Usuario</th>
              <th className="table-header-cell">Obs.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr
                key={`${m.id}-${m.producto}-${m.cantidad}-${m.fecha}`}
                className="table-row"
              >
                <td className="table-cell">
                  {new Date(m.fecha).toLocaleString()}
                </td>
                <td className="table-cell">{m.tipo}</td>
                <td className="table-cell">{m.bodega}</td>
                <td className="table-cell">{m.producto}</td>
                <td className="table-cell">{m.cantidad}</td>
                <td className="table-cell">{m.proveedor || m.cliente || '-'}</td>
                <td className="table-cell">{m.usuario || '-'}</td>
                <td className="table-cell">{m.observacion || '-'}</td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr className="table-row">
                <td
                  className="table-cell table-cell-empty"
                  colSpan={8}
                >
                  No hay movimientos que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
