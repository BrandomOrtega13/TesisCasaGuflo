import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';

type FormState = {
  nombre: string;
  direccion: string;
};

export default function BodegaForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'nuevo';

  const [form, setForm] = useState<FormState>({
    nombre: '',
    direccion: '',
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isNew && id) {
      const load = async () => {
        try {
          const r = await api.get(`/bodegas/${id}`);
          setForm({
            nombre: r.data.nombre ?? '',
            direccion: r.data.direccion ?? '',
          });
        } catch (err) {
          console.error(err);
          setMsg('Error al cargar bodega');
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
        await api.post('/bodegas', form);
      } else if (id) {
        await api.put(`/bodegas/${id}`, form);
      }

      navigate('/bodegas');
    } catch (err: any) {
      console.error(err);
      const m = err.response?.data?.message || 'Error al guardar bodega';
      setMsg(m);
    } finally {
      setLoading(false);
    }
  };

  const msgClass =
    msg && msg.includes('Error')
      ? 'form-message form-message-error'
      : msg
      ? 'form-message form-message-success'
      : 'form-message';

  return (
    <div className="form-page">
      <div className="card">
        <button
          type="button"
          onClick={() => navigate('/bodegas')}
          className="btn-link-back"
        >
          ← Volver
        </button>

        <h2 className="form-title">
          {isNew ? 'Nueva bodega' : 'Editar bodega'}
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
            <label className="form-label">Dirección</label>
            <input
              name="direccion"
              value={form.direccion}
              onChange={onChange}
              className="form-input"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>

          {msg && <p className={msgClass}>{msg}</p>}
        </form>
      </div>
    </div>
  );
}
