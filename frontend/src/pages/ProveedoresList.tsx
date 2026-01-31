import { useEffect, useState } from 'react';
import api from '../lib/api';
import ProveedorFormModal from '../components/ProveedorFormModal';

type Proveedor = {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
};

export default function ProveedoresList() {
  const [activos, setActivos] = useState<Proveedor[]>([]);
  const [inactivos, setInactivos] = useState<Proveedor[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // === modal form ===
  const [formOpen, setFormOpen] = useState(false);
  const [formId, setFormId] = useState<string | null>(null); // null => nuevo

  const openNew = () => {
    setFormId(null);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setFormId(id);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormId(null);
  };

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [aRes, iRes] = await Promise.all([
        api.get('/proveedores'),
        api.get('/proveedores/inactivos'),
      ]);
      setActivos(aRes.data || []);
      setInactivos(iRes.data || []);
    } catch (err) {
      console.error(err);
      setMsg('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDeactivate = async (id: string) => {
    if (!window.confirm('¿Desactivar este proveedor?')) return;
    try {
      await api.delete(`/proveedores/${id}`);
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al desactivar proveedor');
    }
  };

  const onReactivate = async (id: string) => {
    try {
      await api.put(`/proveedores/${id}/reactivar`);
      load();
    } catch (err) {
      console.error(err);
      setMsg('Error al reactivar proveedor');
    }
  };

  const onHardDelete = async (id: string) => {
    if (
      !window.confirm(
        '⚠ Esta acción eliminará el proveedor definitivamente, incluso si tiene movimientos.\n\n¿Continuar?'
      )
    )
      return;

    try {
      await api.delete(`/proveedores/${id}/hard`);
      load();
    } catch (err: any) {
      console.error(err);
      const m =
        err?.response?.data?.message ||
        'Error al eliminar definitivamente el proveedor';
      setMsg(m);
    }
  };

  const baseRows = showInactive ? inactivos : activos;

  const rows = baseRows.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.contacto || '').toLowerCase().includes(q) ||
      (p.telefono || '').toLowerCase().includes(q) ||
      (p.correo || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page">
      {/* Header en card */}
      <div className="card page-head-card">
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Proveedores</h2>
            <div className="page-subtitle">
              Administra tus proveedores.
            </div>
          </div>

          <div className="page-header-actions">
            <input
              type="text"
              placeholder="Buscar por nombre, contacto, teléfono..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
              <button type="button" onClick={openNew} className="btn-primary">
                + Nuevo proveedor
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
      </div>

      {/* Tabla en card */}
      <div className="card table-card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header-cell">Nombre</th>
                <th className="table-header-cell">Contacto Celular</th>
                <th className="table-header-cell">Teléfono Local</th>
                <th className="table-header-cell">Correo</th>
                <th className="table-header-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell">{p.nombre}</td>
                  <td className="table-cell">{p.contacto || '—'}</td>
                  <td className="table-cell">{p.telefono || '—'}</td>
                  <td className="table-cell">{p.correo || '—'}</td>
                  <td className="table-cell">
                    {!showInactive ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(p.id)}
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
                    ) : (
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
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-cell table-cell-empty">
                    {showInactive
                      ? 'No hay proveedores inactivos que coincidan con la búsqueda.'
                      : 'No hay proveedores registrados que coincidan con la búsqueda.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM */}
      <ProveedorFormModal
        open={formOpen}
        proveedorId={formId}
        onClose={closeForm}
        onSaved={load}
      />
    </div>
  );
}
