import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

type Cliente = {
  id: string;
  identificacion?: string;
  nombre: string;
  telefono?: string;
  correo?: string;
};

export default function ClientesList() {
  const [activos, setActivos] = useState<Cliente[]>([]);
  const [inactivos, setInactivos] = useState<Cliente[]>([]);
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
        api.get('/clientes'),
        api.get('/clientes/inactivos'),
      ]);
      setActivos(aRes.data);
      setInactivos(iRes.data);
    } catch (err) {
      console.error(err);
      setMsg('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Desactivar a "${nombre}"?`)) return;
    try {
      await api.delete(`/clientes/${id}`);
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al desactivar cliente');
    }
  };

  const onReactivate = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Reactivar a "${nombre}"?`)) return;
    try {
      await api.put(`/clientes/${id}/reactivar`);
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al reactivar cliente');
    }
  };

  const onHardDelete = async (id: string, nombre: string) => {
    if (
      !window.confirm(
        `Seguro quieres eliminar este cliente "${nombre}" a pesar de que podría tener movimientos asociados?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/clientes/${id}/hard`);
      setMsg('Cliente eliminado definitivamente');
      load();
    } catch (err: any) {
      console.error(err);
      const backendMsg = err?.response?.data?.message;
      setMsg(backendMsg || 'Error al eliminar definitivamente el cliente');
    }
  };

  const rowsBase = showInactive ? inactivos : activos;
  const q = search.toLowerCase().trim();

  const rows = rowsBase.filter((c) => {
    if (!q) return true;
    return (
      (c.identificacion && c.identificacion.toLowerCase().includes(q)) ||
      c.nombre.toLowerCase().includes(q) ||
      (c.telefono && c.telefono.toLowerCase().includes(q)) ||
      (c.correo && c.correo.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Cabecera de página */}
      <div className="page-header">
        <h2 className="page-header-title">Clientes</h2>
        <div className="page-header-actions">
          <input
            type="text"
            placeholder="Buscar por cédula, nombre, teléfono o correo..."
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
              onClick={() => navigate('/clientes/nuevo')}
              className="btn-primary"
            >
              + Nuevo cliente
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {loading && <p>Cargando...</p>}
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

      {/* Tabla */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-header-cell">Identificación</th>
              <th className="table-header-cell">Nombre</th>
              <th className="table-header-cell">Teléfono</th>
              <th className="table-header-cell">Correo</th>
              <th className="table-header-cell">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="table-row">
                <td className="table-cell">{c.identificacion || '—'}</td>
                <td className="table-cell">{c.nombre}</td>
                <td className="table-cell">{c.telefono || '—'}</td>
                <td className="table-cell">{c.correo || '—'}</td>
                <td className="table-cell">
                  {!showInactive ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(`/clientes/${c.id}`)}
                        className="link-btn"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(c.id, c.nombre)}
                        className="link-btn link-btn-danger"
                      >
                        Desactivar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onReactivate(c.id, c.nombre)}
                        className="link-btn"
                      >
                        Reactivar
                      </button>
                      <button
                        type="button"
                        onClick={() => onHardDelete(c.id, c.nombre)}
                        className="link-btn link-btn-danger"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="table-cell table-cell-empty">
                  {showInactive
                    ? 'No hay clientes inactivos.'
                    : 'No hay clientes registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
