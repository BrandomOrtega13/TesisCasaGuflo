import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

type Producto = {
  id: string;
  sku: string;
  nombre: string;
  categoria?: string | null;
  categoria_id?: string | null;
  proveedor?: string | null;
  stock_total?: number | string | null;
  stock?: number | string | null;
  cantidad?: number | string | null;
  unidades_por_caja?: number | string | null;
  uds_caja?: number | string | null;
  activo?: boolean;
};

export default function ProductsList() {
  const [activos, setActivos] = useState<Producto[]>([]);
  const [inactivos, setInactivos] = useState<Producto[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [aRes, iRes] = await Promise.all([
        api.get('/productos'),
        api.get('/productos/inactivos'),
      ]);

      setActivos(aRes.data);
      setInactivos(iRes.data);
    } catch (err: any) {
      console.error(err);
      const m = err.response?.data?.message || 'Error al cargar productos';
      setMsg(m);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDeactivate = async (id: string) => {
    if (!window.confirm('¿Desactivar este producto?')) return;
    try {
      await api.delete(`/productos/${id}`);
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al desactivar producto');
    }
  };

  const onReactivate = async (id: string) => {
    try {
      await api.put(`/productos/${id}/reactivar`);
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al reactivar producto');
    }
  };

  const onHardDelete = async (id: string) => {
    if (
      !window.confirm(
        '⚠ Esta acción eliminará el producto definitivamente, incluso si tiene movimientos.\n\n¿Continuar?'
      )
    ) {
      return;
    }
    try {
      await api.delete(`/productos/${id}/hard`);
      load();
    } catch (err: any) {
      console.error(err);
      const m =
        err.response?.data?.message ||
        'No se pudo eliminar el producto (revisa el backend).';
      setMsg(m);
    }
  };

  const rowsBase = showInactive ? inactivos : activos;

  const rows = rowsBase.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.sku?.toLowerCase().includes(q) ||
      p.nombre?.toLowerCase().includes(q) ||
      (p.categoria ?? '').toLowerCase().includes(q)
    );
  });

  const getStock = (p: Producto): number => {
    const raw =
      p.stock_total ??
      p.stock ??
      p.cantidad ??
      (p as any).existencia ??
      (p as any).stock_global ??
      0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return n;
  };

  const getUdsCaja = (p: Producto): number | null => {
    const raw =
      p.unidades_por_caja ??
      p.uds_caja ??
      (p as any).unidades_caja ??
      (p as any).u_x_caja ??
      null;
    if (raw === null || raw === undefined) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const isStockBajo = (stock: number) => {
    // REGLA: alerta cuando stock <= 24 unidades
    return stock > 0 && stock <= 24;
  };

  return (
    <div>
      {/* Cabecera de página */}
      <div className="page-header">
        <h2 className="page-header-title">Productos</h2>

        <div className="page-header-actions">
          <input
            placeholder="Buscar por SKU, nombre o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />

          <div className="segmented">
            <button
              type="button"
              onClick={() => setShowInactive(false)}
              className={
                'segmented-button ' +
                (!showInactive ? 'segmented-button--active' : '')
              }
            >
              Activos
            </button>
            <button
              type="button"
              onClick={() => setShowInactive(true)}
              className={
                'segmented-button ' +
                (showInactive ? 'segmented-button--active' : '')
              }
            >
              Inactivos
            </button>
          </div>

          {!showInactive && (
            <button
              type="button"
              onClick={() => navigate('/productos/nuevo')}
              className="btn-primary"
            >
              + Nuevo producto
            </button>
          )}
        </div>
      </div>

      {loading && <p className="list-message">Cargando...</p>}
      {msg && (
        <p
          className={
            'list-message ' +
            (msg.includes('Error')
              ? 'list-message-error'
              : 'list-message-success')
          }
        >
          {msg}
        </p>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-header-cell">SKU</th>
              <th className="table-header-cell">Nombre</th>
              <th className="table-header-cell">Categoría</th>
              <th className="table-header-cell">Stock</th>
              <th className="table-header-cell">UDS/CAJA</th>
              <th className="table-header-cell">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const stock = getStock(p);
              const udsCaja = getUdsCaja(p);
              const stockBajo = isStockBajo(stock);

              const rowClass =
                'table-row' + (stockBajo ? ' stock-low-row' : '');

              return (
                <tr key={p.id} className={rowClass}>
                  <td className="table-cell">{p.sku}</td>
                  <td className="table-cell">{p.nombre}</td>
                  <td className="table-cell">{p.categoria || '—'}</td>
                  <td className="table-cell">
                    {stock}
                    {stockBajo && (
                      <span className="stock-low-badge">Stock bajo</span>
                    )}
                  </td>
                  <td className="table-cell">{udsCaja ?? '—'}</td>
                  <td className="table-cell">
                    <button
                      type="button"
                      onClick={() => navigate(`/productos/${p.id}/detalle`)}
                      className="link-btn"
                    >
                      Ver detalles
                    </button>
                    {!showInactive && (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/productos/${p.id}`)}
                          className="link-btn"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeactivate(p.id)}
                          className="link-btn link-btn-danger"
                        >
                          Desactivar
                        </button>
                      </>
                    )}
                    {showInactive && (
                      <>
                        <button
                          type="button"
                          onClick={() => onReactivate(p.id)}
                          className="link-btn"
                        >
                          Reactivar
                        </button>
                          <button
                          type="button"
                          onClick={() => onHardDelete(p.id)}
                          className="link-btn link-btn-danger"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="table-cell table-cell-empty">
                  {showInactive
                    ? 'No hay productos inactivos.'
                    : 'No hay productos registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
