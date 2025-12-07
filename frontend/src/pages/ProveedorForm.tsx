import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';

type FormState = {
  nombre: string;
  contacto: string;
  telefono: string;
  correo: string;
};

export default function ProveedorForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'nuevo';

  const [form, setForm] = useState<FormState>({
    nombre: '',
    contacto: '',
    telefono: '',
    correo: '',
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isNew && id) {
      const load = async () => {
        try {
          const r = await api.get(`/proveedores/${id}`);
          setForm({
            nombre: r.data.nombre ?? '',
            contacto: r.data.contacto ?? '',
            telefono: r.data.telefono ?? '',
            correo: r.data.correo ?? '',
          });
        } catch (err) {
          console.error(err);
          setMsg('Error al cargar proveedor');
        }
      };
      load();
    }
  }, [id, isNew]);

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
      } else if (id) {
        await api.put(`/proveedores/${id}`, form);
      }

      navigate('/proveedores');
    } catch (err: any) {
      console.error(err);
      const m = err.response?.data?.message || 'Error al guardar proveedor';
      setMsg(m);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="card">
        <button
          type="button"
          onClick={() => navigate('/proveedores')}
          className="btn-link-back"
        >
          ← Volver
        </button>

        <h2 className="form-title">
          {isNew ? 'Nuevo proveedor' : 'Editar proveedor'}
        </h2>

        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-field">
            <label className="form-label">Nombre *</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={onChange}
              className="form-input"
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

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>

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
        </form>
      </div>
    </div>
  );
}
