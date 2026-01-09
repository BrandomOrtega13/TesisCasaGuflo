import { useEffect, useState } from 'react';
import api from '../lib/api';

type CategoriaFormState = {
  nombre: string;
  descripcion: string;
};

export default function CategoriaFormModal({
  open,
  categoriaId,
  onClose,
  onSaved,
}: {
  open: boolean;
  categoriaId: string | null; // null = nueva
  onClose: () => void;
  onSaved: () => void; // para recargar la lista
}) {
  const esNuevo = !categoriaId;

  const [form, setForm] = useState<CategoriaFormState>({
    nombre: '',
    descripcion: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Cargar datos si es edición
  useEffect(() => {
    if (!open) return;

    // reset inicial al abrir
    setMsg(null);

    if (esNuevo) {
      setForm({ nombre: '', descripcion: '' });
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/categorias/${categoriaId}`);
        setForm({
          nombre: res.data?.nombre ?? '',
          descripcion: res.data?.descripcion ?? '',
        });
      } catch (err) {
        console.error(err);
        setMsg('Error al cargar categoría');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, categoriaId, esNuevo]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const onChange =
    (field: keyof CategoriaFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || null,
      };

      if (esNuevo) {
        await api.post('/categorias', payload);
        setMsg('Categoría creada correctamente');
      } else {
        await api.put(`/categorias/${categoriaId}`, payload);
        setMsg('Categoría actualizada correctamente');
      }

      // recargar lista y cerrar
      onSaved();
      setTimeout(() => onClose(), 250);
    } catch (err: any) {
      console.error(err);
      const backendMsg = err?.response?.data?.message;
      setMsg(backendMsg || 'Error al guardar categoría');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            {esNuevo ? 'Nueva categoría' : 'Editar categoría'}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Cerrar"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {loading && <p className="form-message">Cargando...</p>}

          {msg && (
            <p
              className={`form-message ${
                msg.includes('Error')
                  ? 'form-message-error'
                  : 'form-message-success'
              }`}
            >
              {msg}
            </p>
          )}

          <form onSubmit={onSubmit} className="form-grid">
            <div className="form-field">
              <label className="form-label">Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={onChange('nombre')}
                required
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Descripción (opcional)</label>
              <textarea
                value={form.descripcion}
                onChange={onChange('descripcion')}
                rows={3}
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="submit" className="btn-primary" disabled={loading}>
                {esNuevo ? 'Crear' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
