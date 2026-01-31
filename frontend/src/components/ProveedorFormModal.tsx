import { useEffect, useState } from 'react';
import api from '../lib/api';

type FormState = {
  nombre: string;
  contacto: string;
  telefono: string;
  correo: string;
};

const onlyDigits = (s: string) => (s ?? '').replace(/\D/g, '');

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
        setMsg('Error: No se pudo cargar el proveedor');
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

    // Limpieza (para permitir espacios/guiones en números)
    const payload = {
      nombre: form.nombre.trim(),
      contacto: onlyDigits(form.contacto),
      telefono: onlyDigits(form.telefono),
      correo: form.correo.trim(),
    };

    try {
      if (!payload.nombre) {
        setMsg('Error: El nombre es obligatorio');
        setLoading(false);
        return;
      }

      // contacto: obligatorio, mínimo 10 dígitos
      if (!payload.contacto || payload.contacto.length < 10) {
        setMsg('Error: El contacto celular es obligatorio y debe tener mínimo 10 dígitos');
        setLoading(false);
        return;
      }

      // telefono: opcional, si viene debe ser mínimo 9 dígitos
      if (payload.telefono && payload.telefono.length < 9) {
        setMsg('Error: El teléfono local debe tener mínimo 9 dígitos (o dejarlo vacío)');
        setLoading(false);
        return;
      }

      // correo: opcional (el type="email" ya valida formato básico)
      if (isNew) {
        await api.post('/proveedores', payload);
      } else {
        await api.put(`/proveedores/${proveedorId}`, payload);
      }

      onSaved(); // refresca lista
      onClose(); // cierra modal
    } catch (err: any) {
      console.error(err);
      const m = err?.response?.data?.message || 'Error: No se pudo guardar el proveedor';
      // Asegurar prefijo para que se pinte como error
      setMsg(String(m).startsWith('Error') ? m : `Error: ${m}`);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-body">
          <div className="card">
            <div className="prov-modal-head">
              <h2 className="form-title" style={{ margin: 0 }}>
                {isNew ? 'Nuevo proveedor' : 'Editar proveedor'}
              </h2>

              <button
                type="button"
                onClick={onClose}
                className="prov-modal-close"
                aria-label="Cerrar"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {loading && <p className="list-message">Cargando...</p>}

            {msg && (
              <p
                className={
                  'form-message ' +
                  (msg.includes('Error') ? 'form-message-error' : 'form-message-success')
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
                  placeholder="Obligatorio"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Contacto Celular</label>
                <input
                  name="contacto"
                  value={form.contacto}
                  onChange={onChange}
                  className="form-input"
                  inputMode="numeric"
                  required
                  pattern="[0-9]{10,}"
                  minLength={10}
                  title="El contacto celular es obligatorio y debe tener mínimo 10 dígitos"
                  onInvalid={(e) =>
                    (e.currentTarget as HTMLInputElement).setCustomValidity(
                      'El contacto celular es obligatorio y debe tener mínimo 10 dígitos'
                    )    
                  }
                  onInput={(e) => (e.currentTarget as HTMLInputElement).setCustomValidity('')}
                  placeholder="Obligatorio (mínimo 10 dígitos)"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Teléfono Local</label>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={onChange}
                  className="form-input"
                  inputMode="numeric"
                  pattern="[0-9]{9,}"
                  minLength={9}
                  title="El teléfono local debe tener mínimo 9 dígitos (o déjalo vacío)"
                  onInvalid={(e) =>
                    (e.currentTarget as HTMLInputElement).setCustomValidity(
                      'El teléfono local debe tener mínimo 9 dígitos (o déjalo vacío)'
                    )
                  }
                  onInput={(e) => (e.currentTarget as HTMLInputElement).setCustomValidity('')}
                  placeholder="Opcional (mínimo 9 dígitos)"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Correo</label>
                <input
                  name="correo"
                  value={form.correo}
                  onChange={onChange}
                  className="form-input"
                  type="email"
                  placeholder="Opcional"
                  autoComplete="email"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary btn-block">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
