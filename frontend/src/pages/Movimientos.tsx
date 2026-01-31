// src/pages/Movimientos.tsx
import { useEffect, useMemo, useState } from 'react';
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

  // Inputs (lo que el usuario escribe)
  const [searchDraft, setSearchDraft] = useState('');
  const [desdeDraft, setDesdeDraft] = useState(''); // yyyy-mm-dd
  const [hastaDraft, setHastaDraft] = useState(''); // yyyy-mm-dd

  // Filtros aplicados (se usan para filtrar de verdad)
  const [search, setSearch] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

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

  // ==== función auxiliar: convierte la fecha del movimiento a YYYY-MM-DD local ====
  const toDateKey = (value: string): string => {
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const onApply = () => {
    setSearch(searchDraft);
    setDesde(desdeDraft);
    setHasta(hastaDraft);
  };

  const onClear = () => {
    setSearchDraft('');
    setDesdeDraft('');
    setHastaDraft('');
    setSearch('');
    setDesde('');
    setHasta('');
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((m) => {
      const dateKey = toDateKey(m.fecha);

      // filtro por fecha (incluye desde y hasta)
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
        m.usuario ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [items, search, desde, hasta]);

  const formatFecha = (value: string) => {
    const d = new Date(value);
    return d.toLocaleString();
  };

  const formatCantidad = (value: number) => {
    const n = Number(value);
    const entero = Number.isFinite(n) ? Math.round(n) : 0;
    return new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(entero);
  };

  const tipoBadgeClass = (tipo: Movimiento['tipo']) => {
    if (tipo === 'INGRESO') return 'badge badge--in';
    if (tipo === 'DESPACHO') return 'badge badge--out';
    return 'badge';
  };

  if (loading) {
    return <p className="list-message">Cargando movimientos...</p>;
  }

  return (
    <div className="page">
      {/* Header + filtros */}
      <div className="card page-head-card filters-card">
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Movimientos</h2>
            <div className="page-subtitle">
              Filtra por fechas y por texto (producto, bodega, proveedor/cliente, etc.).
            </div>
          </div>
        </div>

        <div className="filters-row">
          <div className="filters-field">
            <div className="filters-label">Buscar</div>
            <input
              placeholder="Buscar por producto, bodega, prov/cliente, obs..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-field">
            <div className="filters-label">Desde</div>
            <input
              type="date"
              value={desdeDraft}
              onChange={(e) => setDesdeDraft(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-field">
            <div className="filters-label">Hasta</div>
            <input
              type="date"
              value={hastaDraft}
              onChange={(e) => setHastaDraft(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-actions">
            <button type="button" className="btn-outline" onClick={onClear}>
              Limpiar
            </button>
            <button type="button" className="btn-primary" onClick={onApply}>
              Aplicar
            </button>
          </div>
        </div>

        <p className="list-message" style={{ marginTop: 6 }}>
          Mostrando <strong>{filtered.length}</strong> de <strong>{items.length}</strong> movimientos
        </p>
      </div>

      {/* Tabla */}
      <div className="card table-card">
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
                <tr key={m.id} className="table-row">
                  <td className="table-cell">{formatFecha(m.fecha)}</td>
                  <td className="table-cell">
                    <span className={tipoBadgeClass(m.tipo)}>{m.tipo}</span>
                  </td>
                  <td className="table-cell">{m.bodega}</td>
                  <td className="table-cell">{m.producto}</td>
                  <td className="table-cell">{formatCantidad(m.cantidad)}</td>
                  <td className="table-cell">{m.proveedor || m.cliente || '-'}</td>
                  <td className="table-cell">{m.usuario || '-'}</td>
                  <td className="table-cell">{m.observacion || '-'}</td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr className="table-row">
                  <td className="table-cell table-cell-empty" colSpan={8}>
                    No hay movimientos que coincidan con el filtro.
                  </td>
                </tr>
              )}

              {items.length === 0 && (
                <tr className="table-row">
                  <td className="table-cell table-cell-empty" colSpan={8}>
                    No hay movimientos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
