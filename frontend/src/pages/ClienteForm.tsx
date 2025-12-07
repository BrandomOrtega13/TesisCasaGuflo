import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';

type FormState = {
  identificacion: string;
  nombre: string;
  telefono: string;
  correo: string;
};

export default function ClienteForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'nuevo';

  const [form, setForm] = useState<FormState>({
    identificacion: '',
    nombre: '',
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
          const r = await api.get(`/clientes/${id}`);
          setForm({
            identificacion: r.data.identificacion ?? '',
            nombre: r.data.nombre ?? '',
            telefono: r.data.telefono ?? '',
            correo: r.data.correo ?? '',
          });
        } catch (err) {
          console.error(err);
          setMsg('Error al cargar cliente');
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
        await api.post('/clientes', form);
      } else if (id) {
        await api.put(`/clientes/${id}`, form);
      }

      navigate('/clientes');
    } catch (err: any) {
      console.error(err);
      const m = err.response?.data?.message || 'Error al guardar cliente';
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
          onClick={() => navigate('/clientes')}
          className="btn-link-back"
        >
          ← Volver
        </button>

        <h2 className="form-title">
          {isNew ? 'Nuevo cliente' : 'Editar cliente'}
        </h2>

        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-field">
            <label className="form-label">Identificación</label>
            <input
              name="identificacion"
              value={form.identificacion}
              onChange={onChange}
              className="form-input"
            />
          </div>

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
