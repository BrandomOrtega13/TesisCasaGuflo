import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

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

  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.get('/categorias');
      setCategorias(res.data);
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
    <div className="app-page">
      {/* Header de la página */}
      <div className="page-header">
        <h2 className="page-header-title">Categorías</h2>

        <div className="page-header-actions">
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />

          <button
            type="button"
            onClick={() => navigate('/categorias/nueva')}
            className="btn-primary"
          >
            + Nueva categoría
          </button>
        </div>
      </div>

      {loading && <p>Cargando...</p>}

      {msg && (
        <p
          className={
            'list-message ' +
            (msg.includes('Error') ? 'list-message-error' : 'list-message-success')
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
                    onClick={() => navigate(`/categorias/${c.id}`)}
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
                <td colSpan={3} className="table-cell-empty">
                  No hay categorías que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
