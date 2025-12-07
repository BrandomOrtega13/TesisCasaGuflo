import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

type Bodega = {
  id: string;
  nombre: string;
  direccion?: string;
};

export default function BodegasList() {
  const [activos, setActivos] = useState<Bodega[]>([]);
  const [inactivos, setInactivos] = useState<Bodega[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [aRes, iRes] = await Promise.all([
        api.get('/bodegas'),
        api.get('/bodegas/inactivas'),
      ]);
      setActivos(aRes.data);
      setInactivos(iRes.data);
    } catch (err) {
      console.error(err);
      setMsg('Error al cargar bodegas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm('¿Desactivar esta bodega?')) return;
    try {
      await api.delete(`/bodegas/${id}`);
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al desactivar bodega');
    }
  };

  const onReactivate = async (id: string) => {
    try {
      await api.put(`/bodegas/${id}/reactivar`);
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al reactivar bodega');
    }
  };

  const onHardDelete = async (id: string) => {
    if (
      !window.confirm(
        '¿Eliminar definitivamente esta bodega? Esta acción no se puede deshacer.'
      )
    )
      return;
    try {
      await api.delete(`/bodegas/${id}/hard`);
      load();
    } catch (err: any) {
      console.error(err);
      const m =
        err?.response?.data?.message ||
        'Error al eliminar definitivamente la bodega';
      setMsg(m);
    }
  };

  const baseRows = showInactive ? inactivos : activos;

  const filtered = baseRows.filter((b) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      b.nombre.toLowerCase().includes(q) ||
      (b.direccion || '').toLowerCase().includes(q)
    );
  });

  const msgClass =
    msg && msg.includes('Error')
      ? 'list-message list-message-error'
      : msg
      ? 'list-message list-message-success'
      : 'list-message';

  return (
    <div>
      <div className="page-header">
        <h2 className="page-header-title">Bodegas</h2>
        <div className="page-header-actions">
          <input
            type="text"
            placeholder="Buscar por nombre o dirección..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />

          <div className="segmented">
            <button
              type="button"
              onClick={() => setShowInactive(false)}
              className={
                !showInactive
                  ? 'segmented-button segmented-button--active'
                  : 'segmented-button'
              }
            >
              Activas
            </button>
            <button
              type="button"
              onClick={() => setShowInactive(true)}
              className={
                showInactive
                  ? 'segmented-button segmented-button--active'
                  : 'segmented-button'
              }
            >
              Inactivas
            </button>
          </div>

          {!showInactive && (
            <button
              type="button"
              onClick={() => navigate('/bodegas/nuevo')}
              className="btn-primary"
            >
              + Nueva bodega
            </button>
          )}
        </div>
      </div>

      {loading && <p className="list-message">Cargando...</p>}
      {msg && <p className={msgClass}>{msg}</p>}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-header-cell">Nombre</th>
              <th className="table-header-cell">Dirección</th>
              <th className="table-header-cell">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="table-row">
                <td className="table-cell">{b.nombre}</td>
                <td className="table-cell">{b.direccion || '—'}</td>
                <td className="table-cell">
                  {!showInactive ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(`/bodegas/${b.id}`)}
                        className="link-btn"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(b.id)}
                        className="link-btn link-btn-danger"
                      >
                        Desactivar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onReactivate(b.id)}
                        className="link-btn"
                      >
                        Reactivar
                      </button>
                      <button
                        type="button"
                        onClick={() => onHardDelete(b.id)}
                        className="link-btn link-btn-danger"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td className="table-cell-empty" colSpan={3}>
                  {showInactive
                    ? 'No hay bodegas inactivas que coincidan con la búsqueda.'
                    : 'No hay bodegas registradas que coincidan con la búsqueda.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
