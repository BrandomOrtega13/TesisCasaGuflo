import { useEffect, useState } from 'react';
import api from '../lib/api';

type FormState = {
  nombre: string;
  contacto: string;
  telefono: string;
  correo: string;
};

export default function ProveedorFormModal({
  open,
  proveedorId,
  onClose,
  onSaved,
}: {
  open: boolean;
  proveedorId: string | null; // null => nuevo
  onClose: () => void;
  onSaved: () => void; // refrescar lista
}) {
  const isNew = !proveedorId;

  const [form, setForm] = useState<FormState>({
    nombre: '',
    contacto: '',
    telefono: '',
    correo: '',
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Cargar datos si es edición
  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setMsg(null);

      // NUEVO => form limpio
      if (isNew) {
        setForm({ nombre: '', contacto: '', telefono: '', correo: '' });
        return;
      }

      // EDITAR => cargar proveedor
      setLoading(true);
      try {
        const r = await api.get(`/proveedores/${proveedorId}`);
        setForm({
          nombre: r.data.nombre ?? '',
          contacto: r.data.contacto ?? '',
          telefono: r.data.telefono ?? '',
          correo: r.data.correo ?? '',
        });
      } catch (err: any) {
        console.error(err);
        setMsg('Error al cargar proveedor');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, proveedorId, isNew]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      if (!form.nombre.trim()) {
        setMsg('El nombre es obligatorio');
        setLoading(false);
        return;
      }

      if (isNew) {
        await api.post('/proveedores', form);
      } else {
        await api.put(`/proveedores/${proveedorId}`, form);
      }

      onSaved(); // refresca lista
      onClose(); // cierra modal
    } catch (err: any) {
      console.error(err);
      const m = err?.response?.data?.message || 'Error al guardar proveedor';
      setMsg(m);
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
            {isNew ? 'Nuevo proveedor' : 'Editar proveedor'}
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
          {loading && <p className="list-message">Cargando...</p>}

          {msg && (
            <p
              className={
                'form-message ' +
                (msg.includes('Error')
                  ? 'form-message-error'
                  : 'form-message-success')
              }
            >
              {msg}
            </p>
          )}

          <form onSubmit={onSubmit} className="form-grid">
            <div className="form-field">
              <label className="form-label">Nombre *</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={onChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Contacto</label>
              <input
                name="contacto"
                value={form.contacto}
                onChange={onChange}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Teléfono</label>
              <input
                name="telefono"
                value={form.telefono}
                onChange={onChange}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Correo</label>
              <input
                name="correo"
                value={form.correo}
                onChange={onChange}
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Guardando...' : 'Guardar'}
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
