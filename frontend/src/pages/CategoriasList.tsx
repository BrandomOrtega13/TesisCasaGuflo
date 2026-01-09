import { useEffect, useState } from 'react';
import api from '../lib/api';
import CategoriaFormModal from '../components/CategoriaFormModal';

type Categoria = {
  id: string;
  nombre: string;
  descripcion?: string | null;
};

export default function CategoriasList() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // === modal form ===
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null); // null = nueva

  const openNew = () => {
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setEditId(id);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
  };

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.get('/categorias');
      setCategorias(res.data || []);
    } catch (err) {
      console.error(err);
      setMsg('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return;
    try {
      await api.delete(`/categorias/${id}`);
      setMsg('Categoría eliminada correctamente');
      load();
    } catch (err: any) {
      console.error(err);
      const backendMsg = err?.response?.data?.message;
      setMsg(backendMsg || 'Error al eliminar categoría');
    }
  };

  const rows = categorias.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.descripcion || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page">
      {/* Header en card */}
      <div className="card page-head-card">
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Categorías</h2>
            <div className="page-subtitle">
              Gestiona las categorías de tus productos (nombre y descripción).
            </div>
          </div>

          <div className="page-header-actions">
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />

            <button type="button" onClick={openNew} className="btn-primary">
              + Nueva categoría
            </button>
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
                <th className="table-header-cell">Descripción</th>
                <th className="table-header-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell">{c.nombre}</td>
                  <td className="table-cell">{c.descripcion || '—'}</td>
                  <td className="table-cell">
                    <button
                      type="button"
                      onClick={() => openEdit(c.id)}
                      className="link-btn"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      className="link-btn link-btn-danger"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr className="table-row">
                  <td colSpan={3} className="table-cell table-cell-empty">
                    No hay categorías que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM */}
      <CategoriaFormModal
        open={formOpen}
        categoriaId={editId}
        onClose={closeForm}
        onSaved={load}
      />
    </div>
  );
}
